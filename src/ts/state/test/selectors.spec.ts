import {
  selectPercentRemaining,
  selectBlockMatchesByMatchId,
  selectSuggestionAndRange,
  selectSingleBlockQueryInFlightById,
  selectNewBlockQueryInFlight
} from "../selectors";
import {
  createBlockQuery,
  createBlockQueriesInFlight,
  validationSetId,
  createInitialData,
  exampleCategoryIds
} from "../../test/helpers/fixtures";

describe("selectors", () => {
  describe("selectValidationById", () => {
    it("should find the given validation by id", () => {
      expect(
        selectBlockMatchesByMatchId(
          {
            currentValidations: [
              {
                matchId: "1"
              },
              {
                matchId: "2"
              }
            ]
          } as any,
          "1"
        )
      ).toEqual({ matchId: "1" });
    });
    it("should return undefined if there is no validation", () => {
      expect(
        selectBlockMatchesByMatchId(
          {
            currentValidations: [
              {
                validationId: "1"
              },
              {
                validationId: "2"
              }
            ]
          } as any,
          "3"
        )
      ).toEqual(undefined);
    });
  });
  describe("selectValidationInFlightById", () => {
    it("should find a single validation in flight by its id", () => {
      const input1 = createBlockQuery(0, 5);
      const input2 = createBlockQuery(10, 15);
      expect(
        selectSingleBlockQueryInFlightById(
          {
            blockQueriesInFlight: createBlockQueriesInFlight(validationSetId, [
              input1,
              input2
			])
          } as any,
          validationSetId,
		  input1.id
        )!.blockQuery
      ).toEqual(input1);
    });
  });
  describe("selectNewValidationInFlight", () => {
    it("should find the new inflight validations given an old and a new state", () => {
      const { state } = createInitialData();
      const input1 = createBlockQuery(0, 5);
      const input2 = createBlockQuery(10, 15);
      expect(
        selectNewBlockQueryInFlight(
          {
            ...state,
            blockQueriesInFlight: createBlockQueriesInFlight(validationSetId, [
              input1
            ])
          },
          {
            ...state,
            blockQueriesInFlight: {
              ...createBlockQueriesInFlight(validationSetId, [input1]),
              ...createBlockQueriesInFlight("set-id-2", [input2])
            }
          }
        )
      ).toEqual([
        {
          validationSetId: "set-id-2",
          ...createBlockQueriesInFlight("set-id-2", [input2])["set-id-2"]
        }
      ]);
    });
    it("shouldn't include validations missing in the new state but present in the old state", () => {
      const { state } = createInitialData();
      const input1 = createBlockQuery(0, 5);
      const input2 = createBlockQuery(10, 15);
      expect(
        selectNewBlockQueryInFlight(
          {
            ...state,
            blockQueriesInFlight: {
              ...createBlockQueriesInFlight(validationSetId, [input1]),
              ...createBlockQueriesInFlight("set-id-2", [input2])
            }
          },
          {
            ...state,
            blockQueriesInFlight: createBlockQueriesInFlight(validationSetId, [
              input1
            ])
          }
        )
      ).toEqual([]);
    });
  });
  describe("selectSuggestionAndRange", () => {
    it("should handle unknown outputs", () => {
      const { state } = createInitialData();
      expect(selectSuggestionAndRange(state, "invalidId", 5)).toEqual(null);
    });
    it("should handle unknown suggestions for found outputs", () => {
      const { state } = createInitialData();
      const currentValidations = [
        {
          matchId: "match-id",
          id: "id",
          from: 0,
          to: 5,
          suggestions: [
            { type: "TEXT_SUGGESTION" as "TEXT_SUGGESTION", text: "example" },
            {
              type: "TEXT_SUGGESTION" as "TEXT_SUGGESTION",
              text: "suggestion"
            }
          ],
          annotation: "Annotation",
          category: {
            id: "1",
            name: "cat",
            colour: "eeeeee"
          },
          inputString: "hai"
        }
      ];
      expect(
        selectSuggestionAndRange(
          {
            ...state,
            currentValidations
          },
          "id",
          15
        )
      ).toEqual(null);
    });
    it("should select a suggestion and the range it should be applied to, given a validation id and suggestion index", () => {
      const { state } = createInitialData();
      const currentValidations = [
        {
          matchId: "match-id",
          id: "id",
          from: 0,
          to: 5,
          suggestions: [
            { type: "TEXT_SUGGESTION" as "TEXT_SUGGESTION", text: "example" },
            {
              type: "TEXT_SUGGESTION" as "TEXT_SUGGESTION",
              text: "suggestion"
            }
          ],
          annotation: "Annotation",
          category: {
            id: "1",
            name: "cat",
            colour: "eeeeee"
          },
          inputString: "hai"
        }
      ];
      expect(
        selectSuggestionAndRange(
          {
            ...state,
            currentValidations
          },
          "match-id",
          0
        )
      ).toEqual({
        from: 0,
        to: 5,
        suggestion: {
          type: "TEXT_SUGGESTION" as "TEXT_SUGGESTION",
          text: "example"
        }
      });
      expect(
        selectSuggestionAndRange(
          {
            ...state,
            currentValidations
          },
          "match-id",
          1
        )
      ).toEqual({
        from: 0,
        to: 5,
        suggestion: {
          type: "TEXT_SUGGESTION" as "TEXT_SUGGESTION",
          text: "suggestion"
        }
      });
    });
  });
  describe("selectPercentRemaining", () => {
    it("should report nothing when there are no validations in flight", () => {
      const { state } = createInitialData();
      expect(selectPercentRemaining(state)).toEqual(0);
    });
    it("should select the percentage remaining for a single validation set", () => {
      const { state: initialState } = createInitialData();
      const input1 = createBlockQuery(0, 5);
      const input2 = createBlockQuery(10, 15);
      let state = {
        ...initialState,
        blockQueriesInFlight: createBlockQueriesInFlight(validationSetId, [
          input1,
          input2
        ])
      };
      expect(selectPercentRemaining(state)).toEqual(100);
      state = {
        ...initialState,
        blockQueriesInFlight: createBlockQueriesInFlight(
          validationSetId,
          [input1, input2],
          exampleCategoryIds,
          4
        )
      };
      expect(selectPercentRemaining(state)).toEqual(50);
    });
    it("should select the percentage remaining for multiple validation sets", () => {
      const { state: initialState } = createInitialData();
      const input1 = createBlockQuery(0, 5);
      const input2 = createBlockQuery(10, 15);
      const input3 = createBlockQuery(10, 15);
      let state = {
        ...initialState,
        blockQueriesInFlight: {
          ...createBlockQueriesInFlight(validationSetId, [input1, input2]),
          ...createBlockQueriesInFlight("set-id-2", [input3])
        }
      };
      expect(selectPercentRemaining(state)).toEqual(100);
      state = {
        ...initialState,
        blockQueriesInFlight: {
          ...createBlockQueriesInFlight(
            validationSetId,
            [input1, input2],
            exampleCategoryIds,
            3
          ),
          ...createBlockQueriesInFlight("set-id-2", [input3], exampleCategoryIds, 3)
        }
      };
      expect(selectPercentRemaining(state)).toEqual(50);
    });
  });
});