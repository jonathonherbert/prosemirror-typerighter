import React, { useState, useEffect } from "react";

import Store, { STORE_EVENT_NEW_STATE } from ".././state/store";
import Results from "./Results";
import Controls from "./Controls";
import { Commands } from ".././commands";
import { IMatch } from ".././interfaces/IMatch";
import { MatcherService } from "..";
import { IPluginState } from "../state/reducer";

interface IProps {
  store: Store<IMatch>;
  matcherService: MatcherService<IMatch>;
  commands: Commands;
  contactHref?: string;
  feedbackHref?: string;
  editorScrollElement: Element;
  getScrollOffset: () => number;
}

const Sidebar = ({
  store,
  matcherService,
  commands,
  contactHref,
  editorScrollElement,
  getScrollOffset,
  feedbackHref
}: IProps) => {
  const [pluginState, setPluginState] = useState<IPluginState | undefined>(
    undefined
  );
  useEffect(() => {
    setPluginState(store.getState());
    store.on(STORE_EVENT_NEW_STATE, setPluginState);
    return () => {
      store.removeEventListener(STORE_EVENT_NEW_STATE, setPluginState);
    };
  }, []);

  return (
    <>
      {pluginState && (
        <div className="Sidebar__section">
          <Controls
            store={store}
            setDebugState={value => commands.setConfigValue("debug", value)}
            setRequestOnDocModified={value =>
              commands.setConfigValue("requestMatchesOnDocModified", value)
            }
            requestMatchesForDocument={commands.requestMatchesForDocument}
            getCurrentCategories={matcherService.getCurrentCategories}
            addCategory={matcherService.addCategory}
            removeCategory={matcherService.removeCategory}
            feedbackHref={feedbackHref}
          />
          <Results
            store={store}
            applySuggestions={commands.applySuggestions}
            applyAutoFixableSuggestions={commands.applyAutoFixableSuggestions}
            selectMatch={commands.selectMatch}
            indicateHighlight={commands.indicateHighlight}
            stopHighlight={commands.stopHighlight}
            contactHref={contactHref}
            editorScrollElement={editorScrollElement}
            getScrollOffset={getScrollOffset}
          />
        </div>
      )}
    </>
  );
};

export default Sidebar;
