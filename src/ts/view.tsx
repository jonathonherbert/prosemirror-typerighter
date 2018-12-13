import { EditorView } from "prosemirror-view";
import { h, render } from "preact";
import { ICommands, ApplySuggestionOptions } from ".";
import ValidationOverlay from "./components/ValidationOverlay";
import Store from "./store";
import ValidationSidebar from "./components/ValidationSidebar";
import ValidationControls from "./components/ValidationControls";

/**
 * Scaffolding for an example view.
 */
const createView = (
  view: EditorView,
  store: Store,
  commands: ICommands,
  sidebarNode: Element,
  controlsNode: Element
) => {
  // Create our overlay node, which is responsible for displaying
  // validation messages when the user hovers over highlighted ranges.
  const overlayNode = document.createElement("div");

  // Bind our commands function to simplify our component interface
  const applySuggestions = (suggestionOpts: ApplySuggestionOptions) =>
    commands.applySuggestions(suggestionOpts)(view.state, view.dispatch);

  const selectValidation = (id: string) =>
    commands.selectValidation(id)(view.state, view.dispatch);

  const indicateHover = (id: string) =>
    commands.indicateHover(id)(view.state, view.dispatch);

  const validateDocument = () =>
    commands.validateDocument(view.state, view.dispatch);

  const setDebugState = (debugState: boolean) => commands.setDebugState(debugState)(view.state, view.dispatch);

  // We wrap this in a container to allow the overlay to be positioned
  // relative to the editable document.
  const wrapperNode = document.createElement("div");
  wrapperNode.classList.add("ValidationPlugin__container");
  view.dom.parentNode!.replaceChild(wrapperNode, view.dom);
  wrapperNode.appendChild(view.dom);
  view.dom.insertAdjacentElement("afterend", overlayNode);

  // Finally, render our components.
  render(
    <ValidationOverlay store={store} applySuggestions={applySuggestions} />,
    overlayNode
  );

  render(
    <ValidationSidebar
      store={store}
      applySuggestions={applySuggestions}
      selectValidation={selectValidation}
      indicateHover={indicateHover}
    />,
    sidebarNode
  );

  render(<ValidationControls store={store} setDebugState={setDebugState} validateDocument={validateDocument} />, controlsNode)
};

export default createView;