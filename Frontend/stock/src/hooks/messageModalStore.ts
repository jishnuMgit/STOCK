import type { ReactNode } from "react";
import type { MessageType } from "../components/common/MessageModal";

export interface QueuedMessage {
  id: number;
  type: MessageType;
  title?: string;
  message: ReactNode;
}

let queue: QueuedMessage[] = [];
let nextId = 0;
const listeners = new Set<() => void>();

export const subscribeToMessages = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const getQueuedMessages = () => queue;

export const enqueueMessage = (
  type: MessageType,
  message: ReactNode,
  title?: string,
) => {
  nextId += 1;
  queue = [...queue, { id: nextId, type, title, message }];
  listeners.forEach((listener) => listener());
};

export const closeCurrentMessage = () => {
  queue = queue.slice(1);
  listeners.forEach((listener) => listener());
};
