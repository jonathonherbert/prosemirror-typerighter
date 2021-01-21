import React, { useContext, memo } from "react";

import { IMatch } from "../interfaces/IMatch";
import {
  IMatchTypeToColourMap,
  getColourForMatch,
  getMatchType,
  MatchType
} from "../utils/decoration";
import TelemetryContext from "../contexts/TelemetryContext";
import SidebarMatchContainer from "./SidebarMatchContainer";
import { createScrollToRangeHandler } from "../utils/component";
import Markdown from "./Markdown";
import { css, SerializedStyles } from "@emotion/react";
import { getSquiggleAsUri } from "../utils/squiggle";

interface IProps {
  match: IMatch;
  matchColours?: IMatchTypeToColourMap;
  selectMatch: (matchId: string) => void;
  indicateHighlight: (blockId: string, _?: any) => void;
  stopHighlight: () => void;
  selectedMatch: string | undefined;
  editorScrollElement: Element;
  getScrollOffset: () => number;
}

export const getSidebarMatchStyles = (
  match: IMatch,
  matchColours?: IMatchTypeToColourMap
): SerializedStyles => {
  const matchType = getMatchType(match);
  const color = matchColours
    ? getColourForMatch(match, matchColours, false).borderColour
    : "";

  switch (matchType) {
    case MatchType.CORRECT:
      return css`
        &:after {
          position: absolute;
          width: 2px;
          content: "";
          left: 0px;
          top: 0px;
          height: 100%;
          background-image: repeating-linear-gradient(
            to top,
            ${color} 0,
            ${color} 3px,
            transparent 3px,
            transparent 5px
          );
          background-size: 2px 5px;
        }
      `;
    case MatchType.DEFAULT:
      return css`
        &:after {
          position: absolute;
          width: 4px;
          content: "";
          left: 0px;
          bottom: 0px;
          height: 100%;
          background-repeat: repeat-y;
          background-position: top;
          background-image: url('${getSquiggleAsUri(color, 'VERTICAL')}');
        }
      `;
    case MatchType.HAS_REPLACEMENT:
      return css`
        border-left: 2px solid ${color};
      `;
  }
};

/**
 * Display information for a single match
 */

const SidebarMatch = ({
  match,
  matchColours,
  indicateHighlight,
  stopHighlight,
  selectedMatch,
  editorScrollElement,
  getScrollOffset
}: React.PropsWithChildren<IProps>) => {
  const { telemetryAdapter } = useContext(TelemetryContext);

  const scrollToRange = createScrollToRangeHandler(
    match,
    getScrollOffset,
    editorScrollElement,
    telemetryAdapter
  );

  const handleMouseEnter = () => {
    indicateHighlight(match.matchId);
  };

  const handleMouseLeave = () => {
    stopHighlight();
  };

  return (
    <li className="Sidebar__list-item">
      <SidebarMatchContainer
        css={getSidebarMatchStyles(match, matchColours)}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={scrollToRange}
        title="Click to scroll to this match"
        isSelected={selectedMatch === match.matchId}
      >
        <div className={"SidebarMatch__header"}>
          <div className="SidebarMatch__header-label">
            <div>
              <div className="SidebarMatch__header-match-text">
                {match.matchedText}
              </div>
              <div className="SidebarMatch__header-description">
                <Markdown markdown={match.message} />
              </div>
            </div>
          </div>
        </div>
      </SidebarMatchContainer>
    </li>
  );
};

export default memo(SidebarMatch);
