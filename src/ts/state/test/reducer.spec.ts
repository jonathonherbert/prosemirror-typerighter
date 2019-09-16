import { Transaction } from "prosemirror-state";
import { DecorationSet } from "prosemirror-view";
import {
  selectMatch,
  setDebugState,
  applyNewDirtiedRanges,
  validationRequestForDocument,
  validationRequestError,
  validationRequestForDirtyRanges,
  validationRequestSuccess,
  newHoverIdReceived
} from "../actions";
import { selectBlockQueriesInFlightForSet } from "../selectors";
import { createValidationPluginReducer, IPluginState } from "../reducer";
import {
  createDebugDecorationFromRange,
  getNewDecorationsForCurrentValidations,
  createDecorationForValidationRange
} from "../../utils/decoration";
import { expandRangesToParentBlockNode } from "../../utils/range";
import { createDoc, p } from "../../test/helpers/prosemirror";
import { IBlockMatches } from "../../interfaces/IValidation";
import {
  createBlockResults,
  createBlockQuery,
  exampleCategoryIds,
  createBlockQueriesInFlight,
  validationSetId,
  createInitialData,
  defaultDoc,
  addOutputsToState,
  createBlockMatches
} from "../../test/helpers/fixtures";
import { createValidationId } from "../../utils/validation";

const reducer = createValidationPluginReducer(expandRangesToParentBlockNode);

describe("Action handlers", () => {
  describe("No action", () => {
    it("should just return the state", () => {
      const { state, tr } = createInitialData();
      expect(reducer(tr, state)).toEqual(state);
    });
  });
  describe("Unknown action", () => {
    const { state, tr } = createInitialData();
    expect(reducer(tr, state, { type: "UNKNOWN_ACTION" } as any)).toEqual(
      state
    );
  });
  describe("validationRequestForDocument", () => {
    it("should apply dirty ranges for the entire doc", () => {
      const { state, tr } = createInitialData();
      expect(
        reducer(
          tr,
          state,
          validationRequestForDocument(validationSetId, exampleCategoryIds)
        )
      ).toMatchObject({
        blockQueriesInFlight: createBlockQueriesInFlight(validationSetId, [
          {
            from: 1,
            inputString: "Example text to validate",
            to: 26,
            id: "0-from:1-to:26"
          }
        ])
      });
    });
  });
  describe("validationRequestForDirtyRanges", () => {
    it("should remove the pending status and any dirtied ranges, and mark the validation as in flight", () => {
      const { state, tr } = createInitialData();
      expect(
        reducer(
          tr,
          {
            ...state,
            debug: true,
            dirtiedRanges: [{ from: 5, to: 10 }],
            validationPending: true
          },
          validationRequestForDirtyRanges(validationSetId, exampleCategoryIds)
        )
      ).toEqual({
        ...state,
        debug: true,
        dirtiedRanges: [],
        decorations: new DecorationSet().add(tr.doc, [
          createDebugDecorationFromRange({ from: 1, to: 25 }, false)
        ]),
        validationPending: false,
        blockQueriesInFlight: createBlockQueriesInFlight(validationSetId, [
          {
            inputString: "Example text to validate",
            from: 1,
            to: 25,
            id: "0-from:1-to:25"
          }
        ])
      });
    });
    it("should remove debug decorations, if any", () => {
      const { state, tr } = createInitialData();
      const newState = reducer(
        tr,
        {
          ...state,
          debug: true,
          dirtiedRanges: [{ from: 5, to: 10 }],
          decorations: new DecorationSet().add(tr.doc, [
            createDebugDecorationFromRange({ from: 1, to: 3 })
          ]),
          validationPending: true
        },
        validationRequestForDirtyRanges("id", exampleCategoryIds)
      );
      expect(newState.decorations).toEqual(
        new DecorationSet().add(tr.doc, [
          createDebugDecorationFromRange({ from: 1, to: 25 }, false)
        ])
      );
    });
    it("should add a total to the validations in flight", () => {
      const doc = createDoc(
        p("Example text to validate"),
        p("More text to validate")
      );
      const { state, tr } = createInitialData(doc);
      const newState = reducer(
        tr,
        {
          ...state,
          debug: true,
          dirtiedRanges: [{ from: 5, to: 10 }, { from: 28, to: 35 }],
          decorations: new DecorationSet(),
          validationPending: true
        },
        validationRequestForDirtyRanges("id", exampleCategoryIds)
      );
      expect(selectBlockQueriesInFlightForSet(newState, "id")!.total).toEqual(
        2
      );
    });
  });
  describe("validationRequestSuccess", () => {
    it("shouldn't do anything if there's nothing in the response and nothing to clean up", () => {
      const { state, tr } = createInitialData();
      expect(
        reducer(
          tr,
          state,
          validationRequestSuccess({
            blockResults: [],
            validationSetId
          })
        )
      ).toEqual(state);
    });
    it("shouldn't do anything if there are no categories", () => {
      const { state, tr } = createInitialData();
      expect(
        reducer(
          tr,
          state,
          validationRequestSuccess({
            blockResults: [],
            validationSetId
          })
        )
      ).toEqual(state);
    });
    it("should add incoming validations to the state", () => {
      const { state, tr } = createInitialData();
      let localState = reducer(
        tr,
        state,
        applyNewDirtiedRanges([{ from: 1, to: 3 }])
      );
      localState = reducer(
        tr,
        localState,
        validationRequestForDirtyRanges(validationSetId, exampleCategoryIds)
      );
      expect(
        reducer(
          tr,
          localState,
          validationRequestSuccess({
            blockResults: [createBlockResults(1, 25)],
            validationSetId
          })
        ).currentValidations
      ).toMatchObject([createBlockMatches(1, 4)]);
    });
    it("should create decorations for the incoming validations", () => {
      const { state, tr } = createInitialData();
      expect(
        reducer(
          tr,
          state,
          validationRequestSuccess({
            blockResults: [createBlockResults(5, 10)],
            validationSetId
          })
        )
      ).toMatchSnapshot();
    });
    describe("superceded matches", () => {
      it("should remove previous validations & decorations that match the category of the incoming match, leaving other validations alone", () => {
        const { state: initialState, tr } = createInitialData();
        const blockQuery = createBlockQuery(0, 15, "Example text to validate");
        const category = {
          id: "this-category-should-remain",
          colour: "purple",
          name:
            "This category should remain untouched -- it's not included in the categories for the incoming matches"
        };
        const validationOutput1 = createBlockResults(0, 15, 1, 7);
        const validationOutput2 = createBlockResults(
          0,
          15,
          9,
          13,
          [],
          category
        );
        const validationOutput3 = createBlockResults(0, 15, 17, 25);
        const blockQueriesInFlight = createBlockQueriesInFlight(
          validationSetId,
          [blockQuery],
          validationOutput1.categoryIds
        );

        const state: IPluginState = {
          ...initialState,
          blockQueriesInFlight
        };

        const newState = reducer(
          tr,
          addOutputsToState(state, tr.doc, [
            validationOutput1.blockMatches[0],
            validationOutput2.blockMatches[0],
            validationOutput3.blockMatches[0]
          ]),
          validationRequestSuccess({
            blockResults: [{
              ...blockQuery,
              blockMatches: [],
              categoryIds: ['1'],
              validationId: blockQuery.id
            }],
            validationSetId
          })
        );

        expect(newState.currentValidations).toEqual([
          validationOutput2.blockMatches[0],
          validationOutput3.blockMatches[0]
        ]);

        expect(newState.decorations).toEqual(
          new DecorationSet().add(tr.doc, [
            ...createDecorationForValidationRange(
              validationOutput2.blockMatches[0]
            ),
            ...createDecorationForValidationRange(
              validationOutput3.blockMatches[0]
            )
          ])
        );
      });
    });
    it("should not apply validations if the ranges they apply to have since been dirtied", () => {
      const { state, tr } = createInitialData(defaultDoc, 1337);
      let localState = reducer(
        tr,
        state,
        applyNewDirtiedRanges([{ from: 1, to: 3 }])
      );
      localState = reducer(
        tr,
        localState,
        validationRequestForDirtyRanges("id", exampleCategoryIds)
      );
      localState = reducer(
        tr,
        localState,
        applyNewDirtiedRanges([{ from: 1, to: 3 }])
      );
      expect(
        reducer(
          tr,
          localState,
          validationRequestSuccess({
            blockResults: [createBlockResults(1, 3)],
            validationSetId
          })
        )
      ).toEqual({
        ...localState,
        dirtiedRanges: [{ from: 1, to: 3 }],
        currentValidations: [],
        validationPending: true
      });
    });
  });
  describe("validationRequestError", () => {
    it("Should re-add the in-flight validation ranges as dirty ranges, and remove the inflight validation", () => {
      const { state: initialState, tr } = createInitialData();
      const state = {
        ...initialState,
        blockQueriesInFlight: createBlockQueriesInFlight(validationSetId, [
          createBlockQuery(1, 25, "Example text to validate")
        ])
      };
      const newState = reducer(
        tr,
        state,
        validationRequestError({
          validationSetId,
          validationId: createValidationId(0, 1, 25),
          message: "Too many requests"
        })
      );
      expect(newState).toMatchObject({
        blockQueriesInFlight: {},
        dirtiedRanges: [
          {
            from: 1,
            to: 25
          }
        ],
        decorations: new DecorationSet(),
        error: "Too many requests"
      });
    });
  });
  describe("newHoverIdReceived", () => {
    it("should update the hover id", () => {
      const { state } = createInitialData();
      expect(
        reducer(
          new Transaction(createDoc),
          state,
          newHoverIdReceived("exampleHoverId", undefined)
        )
      ).toEqual({
        ...state,
        hoverId: "exampleHoverId",
        hoverInfo: undefined
      });
    });
    it("should add hover decorations", () => {
      const { state, tr } = createInitialData();
      const output: IBlockMatches = {
        matchId: "match-id",
        from: 0,
        to: 5,
        annotation: "Annotation",
        category: {
          id: "1",
          name: "cat",
          colour: "eeeeee"
        }
      };
      const localState = {
        ...state,
        currentValidations: [output],
        decorations: new DecorationSet().add(
          tr.doc,
          createDecorationForValidationRange(output, false, true)
        )
      };
      expect(reducer(tr, localState, newHoverIdReceived("match-id"))).toEqual({
        ...localState,
        decorations: new DecorationSet().add(
          tr.doc,
          createDecorationForValidationRange(output, true, true)
        ),
        hoverId: "match-id",
        hoverInfo: undefined
      });
    });
    it("should remove hover decorations", () => {
      const { state, tr } = createInitialData();
      const output: IBlockMatches = {
        matchId: "match-id",
        from: 0,
        to: 5,
        annotation: "Annotation",
        category: {
          id: "1",
          name: "cat",
          colour: "eeeeee"
        }
      };
      const localState = {
        ...state,
        decorations: new DecorationSet().add(tr.doc, [
          ...createDecorationForValidationRange(output, true, true)
        ]),
        currentValidations: [output],
        hoverId: "match-id",
        hoverInfo: undefined
      };
      expect(
        reducer(tr, localState, newHoverIdReceived(undefined, undefined))
      ).toEqual({
        ...localState,
        decorations: new DecorationSet().add(tr.doc, [
          ...createDecorationForValidationRange(output, false, true)
        ]),
        hoverId: undefined,
        hoverInfo: undefined
      });
    });
  });
  describe("handleNewDirtyRanges", () => {
    it("should remove any decorations and validations that touch the passed ranges", () => {
      const { state } = createInitialData();
      const currentValidations: IBlockMatches[] = [
        {
          matchId: "match-id",
          from: 1,
          to: 7,
          annotation: "Annotation",
          category: {
            id: "1",
            name: "cat",
            colour: "eeeeee"
          }
        }
      ];
      const stateWithCurrentValidationsAndDecorations = {
        ...state,
        currentValidations,
        decorations: getNewDecorationsForCurrentValidations(
          currentValidations,
          state.decorations,
          defaultDoc
        )
      };
      expect(
        reducer(
          new Transaction(defaultDoc),
          stateWithCurrentValidationsAndDecorations,
          applyNewDirtiedRanges([{ from: 1, to: 2 }])
        )
      ).toEqual({
        ...state,
        validationPending: true,
        dirtiedRanges: [{ from: 1, to: 2 }]
      });
    });
  });
  describe("selectValidation", () => {
    it("should apply the selected validation id", () => {
      const { state } = createInitialData();
      const otherState = {
        ...state,
        currentValidations: [
          {
            matchId: "match-id",
            inputString: "example",
            from: 1,
            to: 1,
            annotation: "example",
            suggestions: [],
            category: {
              id: "1",
              name: "cat",
              colour: "eeeeee"
            },
            id: "exampleId"
          }
        ]
      };
      expect(
        reducer(
          new Transaction(createDoc),
          otherState,
          selectMatch("exampleId")
        )
      ).toEqual({
        ...otherState,
        selectedMatch: "exampleId"
      });
    });
  });
  describe("setDebug", () => {
    it("should set the debug state", () => {
      const { state } = createInitialData();
      expect(
        reducer(new Transaction(createDoc), state, setDebugState(true))
      ).toEqual({ ...state, debug: true });
    });
  });
});