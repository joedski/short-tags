// @flow


type Location = {
  start: {
    column: number,
    line: number,
    offset: number,
  },
  end: {
    column: number,
    line: number,
    offset: number,
  },
};

type TextEntity = {
  type: 'text',
  text: string,
  sourceText: string,
  location: Location,
};

type TagOpenEntity = {
  type: 'tagOpen',
  tagName: string,
  attributes: Map<string, string>,
  sourceText: string,
  location: Location
};

type TagSelfClosingEntity = {
  type: 'tagSelfClosing',
  tagName: string,
  attributes: Map<string, string>,
  sourceText: string,
  location: Location
};

type TagCloseEntity = {
  type: 'tagClose',
  tagName: string,
  sourceText: string,
  location: Location,
};

type Entity = TagOpenEntity | TagCloseEntity | TagSelfClosingEntity | TextEntity;

type TagEntity = {
  type: 'tag',
  tagName: string,
  attributes: Map<string, string>,
  children: Tree,
  tagOpen: TagOpenEntity,
  // Tags don't necessarily have a closing tag.
  // This is especially true for things like document references.
  tagClose: ?TagCloseEntity,
  // True if children is empty.
  empty: boolean,
  location: Location,
  contentsLocation: Location,
};

// TagCloseEntity can get left in if no TagOpenEntity takes it up.
// The next stage will either output it as text or more likely ignore it.
// Maybe flag it as an error.
type Tree = Array<TextEntity | TagEntity | TagCloseEntity>;

type StackFrame = {
  tree: Tree,
  list: Array<Entity>,
  tagOpen?: TagOpenEntity,
};


export function createTag({
  openTag: TagOpenEntity,
  closeTag?: TagCloseEntity,
  contents: Tree = [],
}): TagEntity {
  return {
    type: 'tag',
    tagName: openTag.tagName,
    attributes: openTag.attributes,
    children: contents,
    tagOpen,
    tagClose,
    empty: contents.length === 0,
    location: {
      start: openTag.location.start,
      end: closeTag ? closeTag.location.end : openTag.location.end,
    },
    contentsLocation: {
      start: openTag.location.end,
      end: closeTag ? closeTag.location.start : openTag.location.end,
    },
  };
}

export default function treeify(entities: Array<Entity>): Tree {
  const stack = [
    { tree: [], list: entities },
  ];

  function peek() { return stack[ stack.length - 1 ]; }
  function pop() { return stack.pop(); }
  function push( frame ) { stack.push( frame ); return peek(); }
  function swap( frame ) { pop(); return push( frame ); }

  while( peek().list.length ) {
    const { tree, list, openTag } = peek();
    const [ entity, ...rest ] = list;

    switch( entity.type ) {
      case 'text': {
        swap({
          list: rest,
          tree: [ ...tree, entity ],
          openTag,
        });
        break;
      }

      case 'tagOpen': {
        push({
          list: rest,
          tree: [],
          openTag: entity,
        });
        break;
      }

      case 'tagClose': {
        if( openTag && openTag.tagName === entity.tagName ) {
          pop();
          const { tree: outerTree, openTag: outerOpenTag } = peek();
          const tag = createTag({ openTag, closeTag: entity, contents: tree });
          swap({
            list: rest,
            tree: [ ...outerTree, tag ],
            openTag: outerOpenTag,
          });
        }
        else {
          swap({
            list: rest,
            tree: [ ...tree, entity ],
            openTag,
          });
        }

        break;
      }

      case 'tagSelfClosing': {
        const tag = createTag({ openTag: entity });
        swap({
          list: rest,
          tree: [ ...tree, tag ],
          openTag,
        });
        break;
      }

      default: {
        console.warn( `unrecognized entity of type ${entity.type}:`, entity );
        swap({
          list: rest,
          tree: [ ...tree, entity ],
          openTag,
        });
      }
    }
  }

  // Lastly, flatten any unclosed openTags.
  while( stack.length > 1 ) {
    const { openTag, tree } = pop();
    const { openTag: outerOpenTag, tree: outerTree } = pop();
    const emptyTag = createTag({ openTag });

    push({
      // We can just discard list because we're done with it.
      openTag: outerOpenTag,
      tree: [ ...outerTree, emptyTag, ...tree ],
    });
  }

  return peek().tree;
}
