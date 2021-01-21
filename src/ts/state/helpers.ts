import {
  IPluginState,
  IIgnoreMatchPredicate,
  includeAllMatches
} from "./reducer";
import {
  createDecorationsForMatch,
  createDecorationsForMatches
} from "../utils/decoration";
import { DecorationSet } from "prosemirror-view";
import { TFilterMatches } from "../utils/plugin";
import { Node } from "prosemirror-model";

export const addMatchesToState = <TPluginState extends IPluginState>(
  state: TPluginState,
  doc: any,
  matches: Array<TPluginState["currentMatches"][number]>,
  ignoreMatch: IIgnoreMatchPredicate = includeAllMatches
) => {
  const matchesToApply = matches.filter(match => !ignoreMatch(match));
  const decorations = matchesToApply.reduce(
    (set, output) => set.add(doc, createDecorationsForMatch(output)),
    new DecorationSet()
  );
  return {
    ...state,
    currentMatches: matchesToApply,
    decorations
  };
};

/**
 * Is the current filter state stale, given the incoming state?
 */
export const isFilterStateStale = <TPluginState extends IPluginState>(
  oldState: TPluginState,
  newState: TPluginState,
  filterMatches?: TFilterMatches<TPluginState["filterState"]>
): filterMatches is TFilterMatches<TPluginState["filterState"]> => {
  const matchesChanged = oldState.currentMatches !== newState.currentMatches;
  const filterStateChanged = oldState.filterState !== newState.filterState;
  const noFilterApplied = !oldState.filterState && !newState.filterState;

  return (
    !!filterMatches &&
    (filterStateChanged || (matchesChanged && !noFilterApplied))
  );
};

export const deriveFilteredDecorations = <TPluginState extends IPluginState>(
  doc: Node,
  newState: TPluginState,
  filterMatches: TFilterMatches<
    TPluginState["filterState"],
    TPluginState["currentMatches"][number]
  >
): TPluginState => {
  const filteredMatches = filterMatches(
    newState.filterState,
    newState.currentMatches
  );
  const filteredMatchIds = filteredMatches.map(_ => _.matchId);

  const matchIdsWithDecorations = newState.decorations
    .find()
    .map(_ => _.spec.id);

  const matchesWithoutDecorations = filteredMatches.filter(
    match => !matchIdsWithDecorations.includes(match.matchId)
  );

  const decorationsToAdd = createDecorationsForMatches(
    matchesWithoutDecorations
  );

  const decorationsToRemove = newState.decorations.find(
    undefined,
    undefined,
    spec => !filteredMatchIds.includes(spec.id)
  );

  const decorations = newState.decorations
    .remove(decorationsToRemove)
    .add(doc, decorationsToAdd);

  return {
    ...newState,
    filteredMatches,
    decorations
  };
};
