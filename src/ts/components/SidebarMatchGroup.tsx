import React, { useState } from "react";

import { IMatch, ISuggestion } from "../interfaces/IMatch";
import { IMatchTypeToColourMap } from "../utils/decoration";
import MatchSnippet from "./MatchSnippet";
import { ArrowDropUp, ArrowDropDown } from "@material-ui/icons";
import { getHtmlFromMarkdown } from "../utils/dom";
import SidebarMatchContainer from "./SidebarMatchContainer";
import { getSidebarMatchStyles } from "./SidebarMatch";

interface IProps {
  matchGroup: Array<IMatch<ISuggestion>>;
  matchColours?: IMatchTypeToColourMap;
  selectMatch: (matchId: string) => void;
  indicateHighlight: (blockId: string, _?: any) => void;
  stopHighlight: () => void;
  selectedMatch: string | undefined;
  editorScrollElement: Element;
  getScrollOffset: () => number;
}

/**
 * Display information for a single match and a group of matches with same ruleId
 */

const SidebarMatchGroup = ({
  matchGroup,
  matchColours,
  indicateHighlight,
  stopHighlight,
  selectedMatch,
  editorScrollElement,
  getScrollOffset
}: IProps) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const firstMatch = matchGroup[0];

  const toggleOpen = () => {
    setIsOpen(!isOpen);
  };

  const getTitleText = (): string => {
    if (isOpen) {
      return "Click to hide all matches for this rule";
    } else {
      return "Click to show all matches for this rule";
    }
  };

  const handleMouseEnter = () => {
    indicateHighlight(firstMatch.matchId);
  };

  const handleMouseLeave = () => {
    stopHighlight();
  };

  return (
    <li className="Sidebar__list-item">
      <SidebarMatchContainer
        className="SidebarMatch__group-container"
        css={getSidebarMatchStyles(firstMatch, matchColours)}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={toggleOpen}
        title={getTitleText()}
        isSelected={selectedMatch === firstMatch.matchId}
      >
        <div className={"SidebarMatch__header"}>
          <div className="SidebarMatch__header-label">
            <div>
              <div className="SidebarMatch__header-match-text">
                {firstMatch.matchedText}
              </div>
              <div
                className="SidebarMatch__header-description"
                dangerouslySetInnerHTML={{
                  __html: getHtmlFromMarkdown(firstMatch.message)
                }}
              ></div>
            </div>
            <div className="SidebarMatch__header-group">
              <div>({matchGroup.length})</div>
              <div>{isOpen ? <ArrowDropUp /> : <ArrowDropDown />}</div>
            </div>
          </div>
        </div>
      </SidebarMatchContainer>
      {isOpen && (
        <ul className="Sidebar__list">
          {matchGroup.map(match => (
            <MatchSnippet
              match={match}
              matchColours={matchColours}
              indicateHighlight={indicateHighlight}
              stopHighlight={stopHighlight}
              getScrollOffset={getScrollOffset}
              editorScrollElement={editorScrollElement}
              key={match.matchId}
            />
          ))}
        </ul>
      )}
    </li>
  );
};

export default SidebarMatchGroup;
