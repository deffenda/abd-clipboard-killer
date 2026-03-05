import { createComponentNode } from "@fmweb/shared";
import type { ComponentNode } from "@fmweb/shared";

const clone = <T>(value: T): T => {
  return structuredClone(value);
};

export const findComponentById = (
  nodes: ComponentNode[],
  componentId: string
): ComponentNode | undefined => {
  for (const node of nodes) {
    if (node.id === componentId) {
      return node;
    }

    const child = findComponentById(node.children, componentId);
    if (child !== undefined) {
      return child;
    }
  }

  return undefined;
};

export const addComponentToTree = (
  nodes: ComponentNode[],
  type: string,
  parentId?: string
): { nodes: ComponentNode[]; created: ComponentNode } => {
  const created = createComponentNode(type);

  if (parentId === undefined) {
    return {
      nodes: [...nodes, created],
      created
    };
  }

  const walk = (items: ComponentNode[]): ComponentNode[] => {
    return items.map((item) => {
      if (item.id === parentId) {
        return {
          ...item,
          children: [...item.children, created]
        };
      }

      if (item.children.length === 0) {
        return item;
      }

      return {
        ...item,
        children: walk(item.children)
      };
    });
  };

  return {
    nodes: walk(nodes),
    created
  };
};

export const updateComponentInTree = (
  nodes: ComponentNode[],
  componentId: string,
  updater: (node: ComponentNode) => ComponentNode
): ComponentNode[] => {
  return nodes.map((node) => {
    if (node.id === componentId) {
      return updater(node);
    }

    if (node.children.length === 0) {
      return node;
    }

    return {
      ...node,
      children: updateComponentInTree(node.children, componentId, updater)
    };
  });
};

export const deleteComponentFromTree = (
  nodes: ComponentNode[],
  componentId: string
): { nodes: ComponentNode[]; removed: boolean } => {
  let removed = false;

  const walk = (items: ComponentNode[]): ComponentNode[] => {
    const next: ComponentNode[] = [];

    for (const item of items) {
      if (item.id === componentId) {
        removed = true;
        continue;
      }

      next.push({
        ...item,
        children: walk(item.children)
      });
    }

    return next;
  };

  return {
    nodes: walk(nodes),
    removed
  };
};

export const duplicateComponentInTree = (
  nodes: ComponentNode[],
  componentId: string
): { nodes: ComponentNode[]; duplicatedId?: string } => {
  const target = findComponentById(nodes, componentId);

  if (target === undefined) {
    return {
      nodes
    };
  }

  const duplicate = clone(target);
  duplicate.id = createComponentNode(target.type).id;

  const walk = (items: ComponentNode[]): ComponentNode[] => {
    const next: ComponentNode[] = [];

    for (const item of items) {
      next.push(item);

      if (item.id === componentId) {
        next.push(duplicate);
      }

      if (item.children.length > 0) {
        next[next.length - 1] = {
          ...item,
          children: walk(item.children)
        };
      }
    }

    return next;
  };

  return {
    nodes: walk(nodes),
    duplicatedId: duplicate.id
  };
};

export const flattenComponents = (nodes: ComponentNode[]): ComponentNode[] => {
  const items: ComponentNode[] = [];

  for (const node of nodes) {
    items.push(node);
    items.push(...flattenComponents(node.children));
  }

  return items;
};
