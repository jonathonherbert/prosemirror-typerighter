import { Transaction } from "prosemirror-state";
import { DecorationSet } from "prosemirror-view";
import {
  selectMatch,
  setConfigValue,
  applyNewDirtiedRanges,
  requestMatchesForDocument,
  requestError,
  requestMatchesForDirtyRanges,
  requestMatchesSuccess,
  newHoverIdReceived,
  requestMatchesComplete as requestComplete,
  removeMatch,
  removeAllMatches
} from "../actions";
import { selectBlockQueriesInFlightForSet } from "../selectors";
import { createReducer, IPluginState } from "../reducer";
import {
  createDebugDecorationFromRange,
  getNewDecorationsForCurrentMatches,
  createDecorationsForMatch
} from "../../utils/decoration";
import { expandRangesToParentBlockNode } from "../../utils/range";
import { createDoc, p } from "../../test/helpers/prosemirror";
import { IMatch, IMatchRequestError } from "../../interfaces/IMatch";
import { addMatchesToState } from "../helpers";
import {
  createMatcherResponse,
  createBlock,
  exampleCategoryIds,
  createBlockQueriesInFlight,
  exampleRequestId,
  createInitialData,
  defaultDoc,
  createMatch,
  createStateWithMatches
} from "../../test/helpers/fixtures";
import { createBlockId } from "../../utils/block";

const reducer = createReducer(expandRangesToParentBlockNode);

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
  describe("requestMatchesForDocument", () => {
    it("should apply dirty ranges for the entire doc", () => {
      const { state, tr } = createInitialData();
      expect(
        reducer(
          tr,
          state,
          requestMatchesForDocument(exampleRequestId, exampleCategoryIds)
        )
      ).toMatchObject({
        requestsInFlight: createBlockQueriesInFlight([
          {
            from: 1,
            text: "Example text to check",
            to: 23,
            id: "0-from:1-to:23",
            skipRanges: []
          }
        ])
      });
    });
  });
  describe("requestMatchesForDirtyRanges", () => {
    it("should remove the pending status and any dirtied ranges, and mark the request as in flight", () => {
      const { state, tr } = createInitialData();
      expect(
        reducer(
          tr,
          {
            ...state,
            config: { ...state.config, debug: true },
            dirtiedRanges: [{ from: 5, to: 10 }],
            requestPending: true
          },
          requestMatchesForDirtyRanges(exampleRequestId, exampleCategoryIds)
        )
      ).toEqual({
        ...state,
        config: {
          ...state.config,
          debug: true
        },
        dirtiedRanges: [],
        decorations: new DecorationSet().add(tr.doc, [
          createDebugDecorationFromRange({ from: 1, to: 22 }, false)
        ]),
        requestPending: false,
        requestsInFlight: createBlockQueriesInFlight([
          {
            text: "Example text to check",
            from: 1,
            to: 22,
            id: "0-from:1-to:22",
            skipRanges: []
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
          config: { ...state.config, debug: true },
          dirtiedRanges: [{ from: 5, to: 10 }],
          decorations: new DecorationSet().add(tr.doc, [
            createDebugDecorationFromRange({ from: 1, to: 3 })
          ]),
          requestPending: true
        },
        requestMatchesForDirtyRanges("id", exampleCategoryIds)
      );
      expect(newState.decorations).toEqual(
        new DecorationSet().add(tr.doc, [
          createDebugDecorationFromRange({ from: 1, to: 22 }, false)
        ])
      );
    });
    it("should add a total to the requests in flight", () => {
      const doc = createDoc(
        p("Example text to check"),
        p("More text to check")
      );
      const { state, tr } = createInitialData(doc);
      const newState = reducer(
        tr,
        {
          ...state,
          config: { ...state.config, debug: true },
          dirtiedRanges: [
            { from: 5, to: 10 },
            { from: 28, to: 35 }
          ],
          decorations: new DecorationSet(),
          requestPending: true
        },
        requestMatchesForDirtyRanges("id", exampleCategoryIds)
      );
      expect(
        selectBlockQueriesInFlightForSet(newState, "id")!.totalBlocks
      ).toEqual(2);
    });
  });
  describe("requestMatchesSuccess", () => {
    it("shouldn't do anything if there's nothing in the response and nothing to clean up", () => {
      const { state, tr } = createInitialData();
      expect(
        reducer(
          tr,
          state,
          requestMatchesSuccess({
            blocks: [{ from: 1, to: 1, text: "hai", id: "1" }],
            matches: [],
            categoryIds: ["some-cat"],
            requestId: exampleRequestId
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
          requestMatchesSuccess({
            blocks: [{ from: 1, to: 1, text: "hai", id: "1" }],
            matches: [],
            categoryIds: [],
            requestId: exampleRequestId
          })
        )
      ).toEqual(state);
    });
    it("should add incoming matches to the state", () => {
      const { state, tr } = createInitialData();
      let localState = reducer(
        tr,
        state,
        applyNewDirtiedRanges([{ from: 1, to: 3 }])
      );
      localState = reducer(
        tr,
        localState,
        requestMatchesForDirtyRanges(exampleRequestId, exampleCategoryIds)
      );
      expect(
        reducer(
          tr,
          localState,
          requestMatchesSuccess(createMatcherResponse([{ from: 1, to: 22 }]))
        ).currentMatches
      ).toMatchObject([createMatch(1, 4)]);
    });
    it("should create decorations for the incoming matches", () => {
      const { state, tr } = createInitialData();
      const newState = reducer(
        tr,
        {
          ...state,
          requestsInFlight: createBlockQueriesInFlight([createBlock(5, 10)])
        },
        requestMatchesSuccess(createMatcherResponse([{ from: 5, to: 10 }]))
      );
      const newMatch = newState.currentMatches[0];
      const newDecorations = new DecorationSet().add(
        tr.doc,
        createDecorationsForMatch(newMatch)
      );
      expect(newState.decorations).toEqual(newDecorations);
    });
    describe("superceded matches", () => {
      const { state: initialState, tr } = createInitialData();
      const firstBlock = createBlock(0, 15, "Example text to check");
      const secondBlock = createBlock(16, 37, "Another block of text");
      const blocks = [firstBlock, secondBlock];
      const category = {
        id: "this-category-should-remain",
        colour: "purple",
        name:
          "This category should remain untouched -- it's not included in the categories for the incoming matches"
      };
      const matcherResponse1 = {
        ...createMatcherResponse([{ from: 0, to: 15, wordFrom: 1, wordTo: 7 }]),
        markAsCorrect: true
      };
      const matcherResponse2 = createMatcherResponse([
        { from: 0, to: 15, wordFrom: 9, wordTo: 13, category }
      ]);
      const matcherResponse3 = createMatcherResponse([
        { from: 16, to: 37, wordFrom: 17, wordTo: 25 }
      ]); // Some other output for another block
      const requestsInFlight = createBlockQueriesInFlight(
        blocks,
        exampleRequestId,
        [...matcherResponse1.categoryIds, ...matcherResponse2.categoryIds]
      );

      const state: IPluginState = addMatchesToState(
        {
          ...initialState,
          requestsInFlight
        },
        tr.doc,
        [
          matcherResponse1.matches[0],
          matcherResponse2.matches[0],
          matcherResponse3.matches[0]
        ]
      );

      it("should remove previous decorations that match block and category of the incoming match", () => {
        const newState = reducer(
          tr,
          state,
          requestMatchesSuccess({
            blocks: [firstBlock],
            categoryIds: ["1"],
            matches: [],
            requestId: exampleRequestId
          })
        );

        expect(newState.decorations).toEqual(
          new DecorationSet().add(tr.doc, [
            ...createDecorationsForMatch(matcherResponse2.matches[0]),
            ...createDecorationsForMatch(matcherResponse3.matches[0])
          ])
        );
      });

      it("should remove checked categories from the remaining categories list for in-flight blocks", () => {
        const newState = reducer(
          tr,
          state,
          requestMatchesSuccess({
            blocks: [firstBlock],
            categoryIds: ["1"],
            matches: [],
            requestId: exampleRequestId
          })
        );

        expect(newState.requestsInFlight["set-id"]!.pendingBlocks).toEqual([
          {
            block: {
              from: 0,
              id: firstBlock.id,
              text: "Example text to check",
              to: 15,
              skipRanges: []
            },
            pendingCategoryIds: ["this-category-should-remain"]
          },
          {
            block: {
              from: 16,
              id: secondBlock.id,
              text: "Another block of text",
              to: 37,
              skipRanges: []
            },
            pendingCategoryIds: ["1", "this-category-should-remain"]
          }
        ]);
      });
      it("should not regenerate decorations for matches that remain", () => {
        const newState = reducer(
          tr,
          state,
          requestMatchesSuccess({
            blocks: [firstBlock],
            categoryIds: ["another-category"],
            matches: [],
            requestId: exampleRequestId
          })
        );

        expect(newState.decorations).toBe(state.decorations);
      });
    });
    it("should not apply matches if the ranges they apply to have since been dirtied", () => {
      const { state, tr } = createInitialData(defaultDoc, 1337);
      let localState = reducer(
        tr,
        state,
        applyNewDirtiedRanges([{ from: 1, to: 3 }])
      );
      localState = reducer(
        tr,
        localState,
        requestMatchesForDirtyRanges("id", exampleCategoryIds)
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
          requestMatchesSuccess(createMatcherResponse([{ from: 1, to: 3 }]))
        )
      ).toEqual({
        ...localState,
        dirtiedRanges: [{ from: 1, to: 3 }],
        currentMatches: [],
        requestPending: true
      });
    });
    it("should not apply matches if they trigger the ignoreMatch predicate", () => {
      const ignoreMatchReducer = createReducer(
        expandRangesToParentBlockNode,
        match => match.from > 3
      );

      const matchSpecs = [
        { from: 2, to: 3 },
        { from: 4, to: 6 }
      ];
      const { state, matches } = createStateWithMatches(
        ignoreMatchReducer,
        matchSpecs
      );

      // We expect only the first match from the response to be applied.
      const currentMatches = matches.slice(0, 1);
      const decorations = getNewDecorationsForCurrentMatches(
        currentMatches,
        new DecorationSet(),
        defaultDoc
      );

      const expectedState = {
        ...state,
        decorations,
        currentMatches
      };

      expect(state).toEqual(expectedState);
    });
  });
  describe("requestMatchesError", () => {
    it("Should re-add the in-flight request ranges as dirty ranges, and remove the inflight request", () => {
      const { state: initialState, tr } = createInitialData();
      const state = {
        ...initialState,
        requestsInFlight: createBlockQueriesInFlight([
          createBlock(1, 25, "Example text to check")
        ])
      };
      const newState = reducer(
        tr,
        state,
        requestError({
          requestId: exampleRequestId,
          blockId: createBlockId(0, 1, 25),
          message: "Too many requests",
          categoryIds: ["example-category"],
          type: "GENERAL_ERROR"
        })
      );
      expect(newState).toMatchObject({
        requestsInFlight: {},
        dirtiedRanges: [
          {
            from: 1,
            to: 25
          }
        ],
        decorations: new DecorationSet(),
        requestErrors: [
          {
            requestId: exampleRequestId,
            blockId: createBlockId(0, 1, 25),
            message: "Too many requests",
            categoryIds: ["example-category"]
          } as IMatchRequestError
        ]
      });
    });
  });
  describe("requestMatchesComplete", () => {
    const { state: initialState, tr } = createInitialData();
    it("should remove the inflight request from the state", () => {
      const state = {
        ...initialState,
        requestsInFlight: createBlockQueriesInFlight([
          createBlock(1, 25, "Example text to check")
        ])
      };
      const newState = reducer(tr, state, requestComplete(exampleRequestId));
      expect(newState.requestsInFlight).toEqual({});
    });
    it("should ignore other requests", () => {
      const state = {
        ...initialState,
        requestsInFlight: createBlockQueriesInFlight([
          createBlock(1, 25, "Example text to check"),
          createBlock(26, 47, "More text to check")
        ])
      };
      const newState = reducer(tr, state, requestComplete(exampleRequestId));
      expect(newState.requestsInFlight).toEqual({});
    });
    it("should do nothing if the request is not found", () => {
      const newState = reducer(
        tr,
        initialState,
        requestComplete(exampleRequestId)
      );
      expect(newState.requestsInFlight).toEqual({});
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
        hoverRectIndex: undefined,
        hoverInfo: undefined
      });
    });
    it("should add hover decorations", () => {
      const { state, tr } = createInitialData();
      const output: IMatch = {
        matcherType: "regex",
        ruleId: "ruleId",
        matchId: "match-id",
        from: 0,
        to: 5,
        matchedText: "block text",
        message: "Annotation",
        category: {
          id: "1",
          name: "cat",
          colour: "eeeeee"
        },
        matchContext: "some more text",
        precedingText: "some more text",
        subsequentText: ""
      };
      const localState = {
        ...state,
        currentMatches: [output],
        decorations: new DecorationSet().add(
          tr.doc,
          createDecorationsForMatch(output, false)
        )
      };
      expect(reducer(tr, localState, newHoverIdReceived("match-id", 1))).toEqual({
        ...localState,
        decorations: new DecorationSet().add(
          tr.doc,
          createDecorationsForMatch(output, true)
        ),
        hoverId: "match-id",
        hoverRectIndex: 1,
        hoverInfo: undefined
      });
    });
    it("should remove hover decorations", () => {
      const { state, tr } = createInitialData();
      const output: IMatch = {
        matcherType: "regex",
        ruleId: "ruleId",
        matchId: "match-id",
        from: 0,
        to: 5,
        matchedText: "block text",
        message: "Annotation",
        category: {
          id: "1",
          name: "cat",
          colour: "eeeeee"
        },
        matchContext: "bigger block of text",
        precedingText: "bigger block of text",
        subsequentText: ""
      };
      const localState = {
        ...state,
        decorations: new DecorationSet().add(tr.doc, [
          ...createDecorationsForMatch(output, true)
        ]),
        currentMatches: [output],
        hoverId: "match-id",
        hoverInfo: undefined
      };
      expect(
        reducer(tr, localState, newHoverIdReceived(undefined, undefined))
      ).toEqual({
        ...localState,
        decorations: new DecorationSet().add(tr.doc, [
          ...createDecorationsForMatch(output, false)
        ]),
        hoverId: undefined,
        hoverRectIndex: undefined,
        hoverInfo: undefined
      });
    });
  });
  describe("handleNewDirtyRanges", () => {
    it("should remove any decorations and matches that touch the passed ranges", () => {
      const { state } = createInitialData();
      const currentMatches: IMatch[] = [
        {
          matcherType: "regex",
          ruleId: "ruleId",
          matchId: "match-id",
          from: 1,
          to: 7,
          matchedText: "block text",
          message: "Annotation",
          category: {
            id: "1",
            name: "cat",
            colour: "eeeeee"
          },
          markAsCorrect: true,
          matchContext: "bigger block of text",
          precedingText: "bigger block of text",
          subsequentText: ""
        }
      ];
      const stateWithCurrentMatchesAndDecorations = {
        ...state,
        currentMatches,
        decorations: getNewDecorationsForCurrentMatches(
          currentMatches,
          state.decorations,
          defaultDoc
        )
      };
      expect(
        reducer(
          new Transaction(defaultDoc),
          stateWithCurrentMatchesAndDecorations,
          applyNewDirtiedRanges([{ from: 1, to: 2 }])
        )
      ).toEqual({
        ...state,
        requestPending: true,
        dirtiedRanges: [{ from: 1, to: 2 }]
      });
    });
  });
  describe("selectMatch", () => {
    it("should apply the selected match id", () => {
      const { state } = createInitialData();
      const otherState = {
        ...state,
        currentMatches: [
          {
            matcherType: "regex",
            ruleId: "ruleId",
            matchId: "match-id",
            text: "example",
            from: 1,
            to: 1,
            matchedText: "block text",
            message: "example",
            suggestions: [],
            category: {
              id: "1",
              name: "cat",
              colour: "eeeeee"
            },
            id: "exampleId",
            matchContext: "bigger block of text",
            precedingText: "bigger block of text",
            subsequentText: ""
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
  describe("removeMatch", () => {
    it("should be a noop when matches aren't present", () => {
      const { state, tr } = createInitialData();
      const newState = reducer(tr, state, removeMatch("id-does-not-exist"));
      expect(newState.currentMatches).toEqual(state.currentMatches);
      expect(newState.decorations).toEqual(state.decorations);
    });
    it("should remove matches when they're present", () => {
      const { state, tr } = createInitialData();
      const matcherResponse = createMatcherResponse([{ from: 5, to: 10 }]);
      let newState = reducer(
        tr,
        {
          ...state,
          requestsInFlight: createBlockQueriesInFlight([createBlock(5, 10)])
        },
        requestMatchesSuccess(matcherResponse)
      );
      newState = reducer(
        tr,
        newState,
        removeMatch(matcherResponse.matches[0].matchId)
      );
      expect(newState.currentMatches).toEqual([]);
      expect(newState.decorations).toEqual(state.decorations);
    });
  });
  describe("removeAllMatches", () => {
    it("should be a noop when matches aren't present", () => {
      const { state, tr } = createInitialData();
      const newState = reducer(tr, state, removeAllMatches());
      expect(newState.currentMatches).toEqual(state.currentMatches);
      expect(newState.decorations).toEqual(state.decorations);
    });
    it("should remove matches when they're present", () => {
      const { state, tr } = createInitialData();
      const matcherResponses = [createMatcherResponse([{ from: 0, to: 5 }]),
        createMatcherResponse([{ from: 10, to: 15 }]),
        createMatcherResponse([{ from: 20, to: 25 }])];

      let newState = matcherResponses.reduce((acc, cur) => {
        return reducer(
          tr,
          {
            ...acc,
            requestsInFlight: createBlockQueriesInFlight([createBlock(5, 10)])
          },
          requestMatchesSuccess(cur)
        );
      }, state)

      newState = reducer(
        tr,
        newState,
        removeAllMatches()
      );

      expect(newState.currentMatches).toEqual([]);
      expect(newState.decorations).toEqual(state.decorations);
    });
    it("should remove error messages when they're present", () => {
      const { state, tr } = createInitialData();
      const matcherResponses = [createMatcherResponse([{ from: 0, to: 5 }]),
        createMatcherResponse([{ from: 10, to: 15 }]),
        createMatcherResponse([{ from: 20, to: 25 }])];

      let newState = matcherResponses.reduce((acc, cur) => {
        const error: IMatchRequestError = {
          requestId: cur.requestId,
          message: "An error occured",
          categoryIds: cur.categoryIds,
          type: "GENERAL_ERROR"
        }
        return reducer(
          tr,
          {
            ...acc,
            requestsInFlight: createBlockQueriesInFlight([createBlock(5, 10)])
          },
          requestError(error)
        );
      }, state)

      newState = reducer(
        tr,
        newState,
        removeAllMatches()
      );
      expect(newState.currentMatches).toEqual([]);
      expect(newState.decorations).toEqual(state.decorations);
      expect(newState.requestErrors).toEqual(state.requestErrors);
    });
  });
  describe("setConfigValue", () => {
    it("should set a config value", () => {
      const { state } = createInitialData();
      expect(
        reducer(
          new Transaction(createDoc),
          state,
          setConfigValue("debug", true)
        )
      ).toEqual({ ...state, config: { ...state.config, debug: true } });
    });
    it("should not accept incorrect config keys", () => {
      const { state } = createInitialData();
      reducer(
        new Transaction(createDoc),
        state,
        // @ts-expect-error
        setConfigValue("not-a-key", true)
      );
    });
    it("should not accept incorrect config values", () => {
      const { state } = createInitialData();
      reducer(
        new Transaction(createDoc),
        state,
        // @ts-expect-error
        setConfigValue("debug", "true")
      );
    });
  });
});
