import React, { useContext } from "react";
import { IMatch } from "..";
import SidebarMatchContainer from "./SidebarMatchContainer";
import { IMatchTypeToColourMap } from "../utils/decoration";
import { createScrollToRangeHandler } from "../utils/component";
import TelemetryContext from "../contexts/TelemetryContext";
import { getSidebarMatchStyles } from "./SidebarMatch";

interface IProps {
  match: IMatch;
  matchColours?: IMatchTypeToColourMap;
  indicateHighlight: (blockId: string, _?: any) => void;
  stopHighlight: () => void;
  getScrollOffset: () => number;
  editorScrollElement: Element;
}

const getMatchContext = (match: IMatch) => {

    const { matchedText, subsequentText, precedingText} = match

    const matchLength = matchedText.length;
    const maxLength = 50;
    const contextLength = (maxLength - matchLength) / 2;

    const before = `${precedingText.length > contextLength ? "..." : ""}${precedingText.substr(precedingText.length - contextLength)}`;
    const after = `${subsequentText.substr(0, contextLength)}${subsequentText.length > contextLength ? "..." : ""}`;

    return `${before}<strong>${matchedText}</strong>${after}`;
};

const MatchSnippet = ({
  match,
  matchColours,
  indicateHighlight,
  stopHighlight,
  getScrollOffset,
  editorScrollElement
}: IProps) => {
  const handleMouseEnter = () => {
    indicateHighlight(match.matchId);
  };

  const handleMouseLeave = () => {
    stopHighlight();
  };
  const { telemetryAdapter } = useContext(TelemetryContext);

  const scrollToRange = createScrollToRangeHandler(
    match,
    getScrollOffset,
    editorScrollElement,
    telemetryAdapter
  );

  return (
    <>
      <li className="Sidebar__list-item SidebarMatch__subset-list">
        <SidebarMatchContainer
          css={getSidebarMatchStyles(match, matchColours)}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onClick={scrollToRange}
          title="Click to scroll to this match"
        >
          <div className={"SidebarMatch__header"}>
            <div className="SidebarMatch__header-label">
              <div>
                <div
                  className="SidebarMatch__header-description"
                  dangerouslySetInnerHTML={{
                    __html: getMatchContext(match)
                  }}
                ></div>
              </div>
            </div>
          </div>
        </SidebarMatchContainer>
      </li>
    </>
  );
};

export default MatchSnippet;
