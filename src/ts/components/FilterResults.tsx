import React, { useContext } from "react";
import { css } from "@emotion/react";
import { Checkbox } from "@guardian/src-checkbox";
import { space } from "@guardian/src-foundations";

import { IMatch } from "..";
import TelemetryContext from "../contexts/TelemetryContext";
import {
  DecorationClassMap,
  getMatchType,
  IMatchTypeToColourMap,
  MatchType
} from "../utils/decoration";
import { iconMap } from "./icons";

const filterOrder = Object.values([
  MatchType.CORRECT,
  MatchType.DEFAULT,
  MatchType.HAS_REPLACEMENT
]);

interface IProps {
  filterState: MatchType[];
  applyFilterState: (matchType: MatchType[]) => void;
  matches: IMatch[];
  matchColours: IMatchTypeToColourMap;
}

const FilterResults = ({ filterState, applyFilterState, matches }: IProps) => {
  const { telemetryAdapter } = useContext(TelemetryContext);
  return (
    <div
      css={css`
        display: flex;
      `}
    >
      {filterOrder.map(matchType => {
        const isDisabled = filterState.includes(matchType);
        const cannotAddFilter = filterState.length >= 2;

        const noMatchesOfThisType = matches.filter(
          match => getMatchType(match) === matchType
        ).length;

        const toggleFilterValue = () => {
          telemetryAdapter?.filterStateToggled(matchType, !!isDisabled);
          applyFilterState(
            isDisabled
              ? filterState.filter(currentType => currentType !== matchType)
              : [...filterState, matchType]
          );
        };

        return (
          <span
            key={matchType}
            css={css`
              margin-right: ${space[2]}px;
            `}
          >
            <Checkbox
              value={matchType}
              defaultChecked={true}
              title="Show/hide matches of this colour"
              disabled={cannotAddFilter && !isDisabled}
              onClick={toggleFilterValue}
              label={
                <span className={DecorationClassMap[matchType]}>
                  <span>{iconMap[matchType].render()}</span>
                  {`(${noMatchesOfThisType})`}
                </span>
              }
            />
          </span>
        );
      })}
    </div>
  );
};

export default FilterResults;
