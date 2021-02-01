import { brandAlt, error, success } from "@guardian/src-foundations";
import flatten from "lodash/flatten";
import { Node } from "prosemirror-model";
import { Decoration, DecorationSet } from "prosemirror-view";
import { IRange, IMatch } from "../interfaces/IMatch";
import { getSquiggleAsUri } from "./squiggle";

export enum MatchType {
  HAS_REPLACEMENT = "HAS_REPLACEMENT",
  DEFAULT = "DEFAULT",
  CORRECT = "CORRECT"
}

export interface IMatchTypeToColourMap {
  hasSuggestion: string;
  hasSuggestionOpacity: string;
  default: string;
  defaultOpacity: string;
  correct: string;
  correctOpacity: string;
}

export const defaultMatchColours = {
  hasSuggestion: error[400],
  hasSuggestionOpacity: "FF",
  default: brandAlt[200],
  defaultOpacity: "AD",
  correct: success[400],
  correctOpacity: "FF"
};

// Our decoration types.
export const DECORATION_MATCH = "DECORATION_MATCH";
export const DECORATION_MATCH_IS_SELECTED = "DECORATION_MATCH_IS_HOVERING";
export const DECORATION_MATCH_HEIGHT_MARKER = "DECORATION_MATCH_HEIGHT_MARKER";
export const DECORATION_DIRTY = "DECORATION_DIRTY";
export const DECORATION_INFLIGHT = "DECORATION_INFLIGHT";

export const DecorationClassMap = {
  [DECORATION_DIRTY]: "MatchDebugDirty",
  [DECORATION_INFLIGHT]: "MatchDebugInflight",
  [DECORATION_MATCH]: "MatchDecoration",
  [DECORATION_MATCH_HEIGHT_MARKER]: "MatchDecoration__height-marker",
  [DECORATION_MATCH_IS_SELECTED]: "MatchDecoration--is-selected",
  [MatchType.CORRECT]: "MatchDecoration--is-correct",
  [MatchType.DEFAULT]: "MatchDecoration--default",
  [MatchType.HAS_REPLACEMENT]: "MatchDecoration--has-replacement"
};

export const DECORATION_ATTRIBUTE_ID = "data-match-id";
export const DECORATION_ATTRIBUTE_HEIGHT_MARKER_ID = "data-height-marker-id";
export const DECORATION_ATTRIBUTE_IS_CORRECT_ID = "data-is-correct-id";

export const createDebugDecorationFromRange = (range: IRange, dirty = true) => {
  const type = dirty ? DECORATION_DIRTY : DECORATION_INFLIGHT;
  return Decoration.inline(
    range.from,
    range.to + 1,
    {
      class: DecorationClassMap[type]
    },
    {
      type
    } as any
  );
};

/**
 * Remove decorations from the given ranges. If decorations are found,
 * expand the search range to include their ranges, too.
 */
export const removeDecorationsFromRanges = (
  decorationSet: DecorationSet,
  ranges: IRange[],
  types = [DECORATION_MATCH, DECORATION_MATCH_HEIGHT_MARKER]
) =>
  ranges.reduce((acc, range) => {
    const predicate = (spec: { [key: string]: any }) =>
      types.indexOf(spec.type) !== -1;
    const decorations = decorationSet.find(range.from, range.to, predicate);
    if (!decorations.length) {
      return acc;
    }
    // Expand the range out to the range of the found decorations.
    const decorationsToRemove = flatten(
      decorations
        .map(decoration =>
          decorationSet.find(decoration.from, decoration.to, predicate)
        )
        .filter(_ => !!_)
    );
    return acc.remove(decorationsToRemove);
  }, decorationSet);

/**
 * Given a matcher response and the current decoration set,
 * returns a new decoration set containing the new matches.
 */
export const getNewDecorationsForCurrentMatches = (
  outputs: IMatch[],
  decorationSet: DecorationSet,
  doc: Node
) => {
  const decorationsToAdd = createDecorationsForMatches(outputs);

  return decorationSet.add(doc, decorationsToAdd);
};

/**
 * Create decorations for the given match.
 */
export const createDecorationsForMatch = (
  match: IMatch,
  isSelected: boolean = false
) => {
  const matchType = getMatchType(match);

  let className = `${DecorationClassMap[DECORATION_MATCH]} ${DecorationClassMap[matchType]}`;
  className += isSelected
    ? ` ${DecorationClassMap[DECORATION_MATCH_IS_SELECTED]}`
    : "";

  const spec = createDecorationSpecFromMatch(match);
  const decorations = [
    Decoration.inline(
      match.from,
      match.to,
      {
        class: className,
        [DECORATION_ATTRIBUTE_ID]: match.matchId
      },
      spec
    )
  ];

  return decorations;
};

export const createDecorationSpecFromMatch = (match: IMatch) => ({
  type: DECORATION_MATCH,
  id: match.matchId,
  categoryId: match.category.id,
  inclusiveStart: false,
  inclusiveEnd: false
});

export const getMatchType = (match: IMatch): MatchType => {
  if (match.markAsCorrect) {
    return MatchType.CORRECT;
  }
  if (match.replacement) {
    return MatchType.HAS_REPLACEMENT;
  }
  return MatchType.DEFAULT;
};

export const getColourForMatch = (
  match: IMatch,
  matchColours: IMatchTypeToColourMap,
  isSelected: boolean
): { backgroundColour: string; borderColour: string } => {
  const matchType = getMatchType(match);
  const {
    backgroundColour,
    backgroundColourSelected,
    borderColour
  } = getColourForMatchType(matchType, matchColours);
  return {
    borderColour,
    backgroundColour: isSelected ? backgroundColourSelected : backgroundColour
  };
};

export const getColourForMatchType = (
  matchType: MatchType,
  matchColours: IMatchTypeToColourMap
): {
  backgroundColour: string;
  borderColour: string;
  backgroundColourSelected: string;
} => {
  const backgroundOpacitySelected = "50";
  const backgroundOpacity = "07";
  switch (matchType) {
    case MatchType.CORRECT:
      return {
        backgroundColour: `${matchColours.correct}${backgroundOpacity}`,
        backgroundColourSelected: `${matchColours.correct}${backgroundOpacitySelected}`,
        borderColour: `${matchColours.correct}${matchColours.correctOpacity}`
      };
    case MatchType.HAS_REPLACEMENT:
      return {
        backgroundColour: `${matchColours.hasSuggestion}${backgroundOpacity}`,
        backgroundColourSelected: `${matchColours.hasSuggestion}${backgroundOpacitySelected}`,
        borderColour: `${matchColours.hasSuggestion}${matchColours.hasSuggestionOpacity}`
      };
    default:
      return {
        backgroundColour: `${matchColours.default}${backgroundOpacity}`,
        backgroundColourSelected: `${matchColours.default}${backgroundOpacitySelected}`,
        borderColour: `${matchColours.default}${matchColours.defaultOpacity}`
      };
  }
};

export const createDecorationsForMatches = (
  matches: IMatch[],
) => flatten(matches.map(match => createDecorationsForMatch(match)));

export const findSingleDecoration = (
  decorationSet: DecorationSet,
  predicate: (spec: any) => boolean
): Decoration | undefined => {
  const decorations = decorationSet.find(undefined, undefined, predicate);
  if (!decorations[0]) {
    return undefined;
  }
  return decorations[0];
};

export const maybeGetDecorationElement = (
  matchId: string
): HTMLElement | null =>
  document.querySelector(`[${DECORATION_ATTRIBUTE_ID}="${matchId}"]`);

const getProseMirrorOffsetValue = (
  element: HTMLElement,
  scrollElement: Element
): number => {
  let offset = element.offsetTop;

  if (element.offsetParent && !element.isEqualNode(scrollElement)) {
    return (offset += getProseMirrorOffsetValue(
      element.offsetParent as HTMLElement,
      scrollElement
    ));
  }

  return offset;
};

export const maybeGetDecorationMatchIdFromEvent = (
  event: Event
): string | undefined => {
  if (!event.target || !(event.target instanceof HTMLElement)) {
    return undefined;
  }
  const target = event.target;
  const targetAttr = target.getAttribute(DECORATION_ATTRIBUTE_ID);
  return targetAttr ? targetAttr : undefined;
};

export const getMatchOffset = (
  matchId: string,
  scrollElement: Element
): number => {
  const element = document.querySelector<HTMLElement>(
    `[${DECORATION_ATTRIBUTE_ID}="${matchId}"]`
  );
  return element ? getProseMirrorOffsetValue(element, scrollElement) : 0;
};

/**
 * Creates a global decoration style tag to style inline decoration elements.
 *
 * This saves us from applying lengthy styles to each match decoration. It's also
 * necessary to apply pseudo-element styling, as this isn't possible with inline styles –
 * see e.g. https://stackoverflow.com/questions/14141374/using-css-before-and-after-pseudo-elements-with-inline-css/20288572
 */
export const createGlobalDecorationStyleTag = (
  matchColours: IMatchTypeToColourMap
): HTMLStyleElement => {
  const correctColours = getColourForMatchType(MatchType.CORRECT, matchColours);
  const hasReplacementColours = getColourForMatchType(MatchType.HAS_REPLACEMENT, matchColours);
  const defaultColours = getColourForMatchType(MatchType.DEFAULT, matchColours);
  const styleContent = `
    .${DecorationClassMap.HAS_REPLACEMENT} {
      background-color: ${hasReplacementColours.backgroundColour};
      border-bottom: 2px solid ${hasReplacementColours.borderColour};
    }

    .${DecorationClassMap.HAS_REPLACEMENT}.MatchDecoration--is-selected {
      background-color: ${hasReplacementColours.backgroundColourSelected};
    }

    .${DecorationClassMap.DEFAULT} {
      position: relative;
      background-color: ${defaultColours.backgroundColour};
    }

    .${DecorationClassMap.DEFAULT}:after {
      position: absolute;
      width: 100%;
      content: "";
      bottom: -3px;
      left: 0px;
      height: 4px;
      background-repeat: repeat-x;
      background-position: top;
      background-image: url('${getSquiggleAsUri(defaultColours.borderColour)}');
    }

    .${DecorationClassMap.DEFAULT}.MatchDecoration--is-selected {
      background-color: ${defaultColours.backgroundColourSelected};
    }
    .${DecorationClassMap.DEFAULT}.MatchDecoration--is-selected:after {
      background: linear-gradient(0deg, ${defaultColours.backgroundColourSelected} 3px, transparent 3px), url('${getSquiggleAsUri(defaultColours.borderColour)}');
    }

    .${DecorationClassMap.CORRECT} {
      background-color: ${correctColours.backgroundColour};
      position: relative;
    }

    .${DecorationClassMap.CORRECT}:after {
      position: absolute;
      width: 100%;
      content: "";
      bottom: -2px;
      left: 0px;
      height: 2px;
      background-image: repeating-linear-gradient(to right, ${correctColours.borderColour} 0, ${correctColours.borderColour} 3px, transparent 3px, transparent 5px);
      background-size: 5px 2px;
    }

    .${DecorationClassMap.CORRECT}.MatchDecoration--is-selected,
    .${DecorationClassMap.CORRECT}.MatchDecoration--is-selected:after {
      background-color: ${correctColours.backgroundColourSelected};
    }
  `;
  const elem = document.createElement("style");
  elem.innerHTML = styleContent;
  return elem;
};
