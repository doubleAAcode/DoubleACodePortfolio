import "@tanstack/react-start/server-only";

import type { FlowDefinition, FlowNode, FlowNodeType } from "./flow-template-types";

export type RuntimeNodeHandlerResult = {
  nextNodeId?: string;
  waitsForInput?: boolean;
  endsConversation?: boolean;
  startsHumanHandoff?: boolean;
  error?: string;
};

export type RuntimeNodeHandlerContext = {
  flow: FlowDefinition;
  node: FlowNode;
};

export type RuntimeNodeHandler = {
  type: FlowNodeType;
  enter?: (context: RuntimeNodeHandlerContext) => RuntimeNodeHandlerResult;
  handleInput?: (context: RuntimeNodeHandlerContext) => RuntimeNodeHandlerResult;
  validate?: (node: FlowNode) => RuntimeNodeHandlerResult;
};

const handlers = new Map<FlowNodeType, RuntimeNodeHandler>();

registerRuntimeNodeHandler({
  type: "MESSAGE",
  enter: ({ flow, node }) => ({
    nextNodeId: firstRuntimeTarget(flow, node.id),
    waitsForInput: !firstRuntimeTarget(flow, node.id),
  }),
});

registerRuntimeNodeHandler({
  type: "MAIN_MENU",
  enter: () => ({ waitsForInput: true }),
  handleInput: () => ({ waitsForInput: false }),
});

registerRuntimeNodeHandler({
  type: "LANGUAGE_SELECT",
  enter: () => ({ waitsForInput: true }),
  handleInput: () => ({ waitsForInput: false }),
});

registerRuntimeNodeHandler({
  type: "HUMAN_HANDOFF",
  enter: () => ({ startsHumanHandoff: true, waitsForInput: true }),
});

registerRuntimeNodeHandler({
  type: "END",
  enter: () => ({ endsConversation: true }),
});

const protectedAdapterTypes: FlowNodeType[] = [
  "CATEGORY_SELECT",
  "PRODUCT_SELECT",
  "PRODUCT_DETAILS",
  "PRODUCT_OPTIONS",
  "CUSTOM_FIELDS",
  "QUANTITY",
  "CART_MENU",
  "CHECKOUT",
  "ORDER_REVIEW",
  "ORDER_CONFIRMATION",
];

for (const type of protectedAdapterTypes) {
  registerRuntimeNodeHandler({
    type,
    enter: () => ({ waitsForInput: true }),
  });
}

export function registerRuntimeNodeHandler(handler: RuntimeNodeHandler) {
  handlers.set(handler.type, handler);
}

export function getRuntimeNodeHandler(type: FlowNodeType) {
  return handlers.get(type);
}

export function isRuntimeNodeTypeSupported(type: FlowNodeType) {
  return handlers.has(type);
}

export function assertRuntimeNodeTypeSupported(type: FlowNodeType) {
  const handler = getRuntimeNodeHandler(type);
  if (!handler) throw new Error(`Unsupported runtime node type: ${type}`);
  return handler;
}

function firstRuntimeTarget(flow: FlowDefinition, nodeId: string) {
  return flow.edges
    .filter((edge) => edge.from === nodeId)
    .sort((a, b) => a.id.localeCompare(b.id))[0]?.to;
}
