import { IPluginState, IIgnoreMatch, includeAllMatches } from "./reducer";
import { IMatch } from "../interfaces/IMatch";
import { createDecorationsForMatch } from "../utils/decoration";
import { DecorationSet } from "prosemirror-view";

export const addMatchesToState = <TMatch extends IMatch>(
  state: IPluginState<TMatch>,
  doc: any,
  matches: TMatch[],
  ignoreMatch: IIgnoreMatch = includeAllMatches
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
