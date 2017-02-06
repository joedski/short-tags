Short Tags 3
============

Because Fuck Your Shit.



Parsing
-------

There are two concessions to flexibility:

- tag-closes that aren't matched with a tag-open are treated either as text or omitted.
- When ever a tag-open does not have a matched tag-close, it's treated as an empty tag.

```
[ text, tag-open, other-tag, text, other-tag, tag-close, text ]
-> [ <text>, <tag-open>:[ <other-tag>, <text>, <other-tag> ], <text> ]

[ text, tag-open, tag-open, text, tag-close, other-tag, tag-close, text ]
-> [ <text>, <tag-open>:[ <tag-open>:[ text ], [ other-tag ] ], <text> ]

[ text, tag, tag, text, tag, other-tag-close, text ]
-> [ <text>, <tag>, <tag>, <text>, <tag>, <text="other-tag-close">, <text> ]
```

It can be done sorta reduction like:
- from the last list of tags and last tree, calculate the next list of tags and next tree.

Basically:
- parseTag: (tagOpen = null, listOfEntities, tree) =
	- let [ entity, ...restOfEntities ] = listOfEntities
	- if entity is type Text
		- return (restOfEntities, (tree with additional child: entity))
	- if entity is type OpenTag
		- let tag, restOfEntities = (parseTag: tagOpen, restOfEntities, tree)
		- return (restOfEntities, (tree with additional child: entity))
	- if entity is type CloseTag
		- if tagOpen and tagOpen.name === tagClose.name
			- return (restOfEntities, tree)
		- else
			- return (restOfEntities, (tree with additional child: Text of entity))
			- NOTE: There should probably be an option to just skip it instead, in which case it's:
				- return (restOfEntities, tree)

If I were recurring:

```
parseContents:: (openTag: ?Entity, list: Array<Entity>, tree: Tree) =>
	(closeTag: ?Entity, rest: Array<Entity>, tree: Tree)
parseContents: (openTag, list, tree) =
	// so this just keeps iterating until we hit an appropriate close tag then return.
	iterate on (tree, rest) starting with (tree, rest: list):
		let (closeTag, rest: restAfterEntity, tree: treeWithEntity) =
			parseEntity (openTag, list: rest, tree)
		if closeTag:
			return (closeTag, rest: restAfterEntity, tree: treeWithEntity)
		else:
			recur (tree: treeWithEntity, rest: restAfterEntity)

parseEntity:: (openTag: ?Entity, list: Array<Entity>, tree: Tree) =>
	(closeTag: ?Entity, rest: Array<Entity>, tree: Tree)
parseEntity: (openTag, list, tree) =
	let [ entity, ...rest ] = list
	case entity.type of
		'text':
			return (rest, tree: [ ...tree, entitiy ])
		'closeTag':
			if openTag and openTag.name == entity.name:
				return (closeTag: entity, rest, tree)
			else
				return (rest, tree: [ ...tree, entity ])
				NOTE: This usually means a close tag with no open tag?
		'openTag':
			let (closeTag, rest: restAfterClose, tree: contents) =
				parseContents (openTag: entity, list: rest, tree: [])
			if closeTag:
				let tagWithContents = tag (openTag: entity, closeTag, contents)
				return (rest: restAfterClose, tree: [ ...tree, tagWithContents ])
			else:
				let emptyTag = tag (openTag: entity)
				return (rest, tree: [ ...tree, emptyTag ])

parseList:: Array<Entity> => Tree
parseList list =
	let (tree) = parseContents (list, tree: [])
	return tree
```

There, that's about as succinct as it gets.

> This looks kinda like JS flavoured ML except that I tend to pass arguments by ... map?  Not really tuple.  Map.  I guess I'm writing objects/records with parens instead of curlies.  Weird.  I think I originally meant them to be tuples, but named items are so much easier to deal with, especially with optionals/maybes.  Given ES6 name/prop punning it's much easier to deal with, though.

I'm pretty sure this is basically what I came up with for the coffeescript treeifier.  Funny enough, in the coffeescript code I mention that I can't figure out how to do it functionally and now I'm so intor FP that doing it iteratively is annoying.  Granted, doing it iteratively there was also annoying, but I guess that part hasn't really changed.

I'm not even sure it's worth considering the iterative case since normally this won't be used for anything hugely deep.  Heh.  But I want to do it for funsies, so...


### Iterative Version

When considering how to de-recur it, it's interesting to note that `parseEntity` is called on every single item in the list at some point.  Or, rather, every time `parseEntity` is called, the head of the list is pulled off as the first thing to do.  This means we know we can just shoot straight through.  It's also interesting to note that `parseContents` never manipulates `list` directly, only `parseEntity` does.

So, the loop is itself inside `parseContents`, thus that is where we should start.  The next consideration is just where our depth comes from.  In the functional version, we "look ahead" by just recurring the next level down, and once all that's been completed, the rest of `case:openTag` handles the flattening.  Can't exactly look ahead, there, so we'll just have to deal with the possible depth at the very end.

```
parseList:: Array<Entity> => Tree
parseList initList =
	let stack = [ (tree: [], list: initList) ]

	// parseContents:
	while (peek stack).list.length:
		// get our stack frame.
		let (tree, list, openTag) = peek stack

		// parseEntity:
		let [ entity, ...rest ] = list
		case entity.type of:
			'text':
				swap stack (list: rest, tree: [ ...tree, entity ], openTag)
			'openTag':
				push stack (list: rest, tree: [], openTag: entity)
			'closeTag':
				if openTag and openTag.name == entity.name:
					pop stack
					let (tree: outerTree, openTag: outerOpenTag) = peek stack
					let newTag = tag (openTag, closeTag: entity, contents: tree)
					swap stack (tree: [ ...outerTree, newTag ], openTag: outerOpenTag, list: rest)
				else:
					swap stack (list: rest, tree: [ ...tree, entity ], openTag)
		// end: parseEntity.

	// To account for the fact that we can't "look ahead" by recurring,
	// we have to check if we're still up and, if so, flatten.
	while stack.length > 1:
		let (openTag, tree) = pop stack
		let (outerOpenTag, outerTree) = pop stack
		let emptyTag = tag (openTag)
		push stack (tree: [ ...outerTree, emptyTag, ...tree ], openTag: outerOpenTag)

	return (peek stack).tree
```

In some ways it's more elegant than the functional approach, certainly no trampolining, but it is a bit more to hold in mind, and flattening has to be taken care of in two places: when a matching `closeTag` is found and at the end if we're not already flat.  Ah well.

When I wrote it in JS, it came out much longer than the Coffeescript version, though mostly because I put everything across multiple lines.  The CS version has fewer object creations, it tracks the index rather than constantly slicing the list, and doesn't use a stack.  It's also much harder to understand.



Walking
-------

Now all we need to do is make a simple walker.  I think it would go something like this:

```js
const tree = treeify(lex(stringWithShortTags));
const walker = createWalker({
	text({ entity, output }) {
		output.text += entity.text;
	},

	tagClose() {
		// ignore.
	},

	tag: {
		enter({ entity: tag, output, stack }) {
			switch( tag.tagName ) {
				case 'link': {
					if( ! tag.empty ) {
						output.text += `<a href="${tag.attributes.href}">`;
					}
					break;
				}
				// ... etc.
			}
		},

		leave({ entity: tag, output, stack }) {
			switch( tag.tagName ) {
				case 'link': {
					if( ! tag.empty ) {
						output.text += '</a>';
					}
					break;
				}
				// ... etc.
			}
		},
	},
});

const { text } = walk({ output: { text: '' } });
```

Another consideration though is that the tree structure isn't really that complicated.  In fact, it's intentionally simple.  The walking part could just be custom each time.



Lexing
------

Before we can process a list of chunks into a tree, we need to generate the chunks.

Chunks here are actually entities, so I don't know why I called them chunks.


### Tag Shorthands

A number of shorthands are included:

- {foo} creates a tag named 'foo'.
- {foo#bar} is an alias for {foo id="bar"}
- {foo=bar} is an alias for {foo value="bar"}
- ~~{foo%} is an alias for {foo isPercent}~~
	- Maybe this should just be treated as a separate tag name?  tag named 'foo%'?  I think that's more sensical.  Yeah, going with that.


### PEG

Here's a lexer in PEG which does not automatically handle the # or = shorthands.

```
Corpus
	= entities:(TagOpen / TagClose / Text)* {
		return entities;
	}

Text
	= chars:(NonOpeningChar / EscapedChar)+ {
		return {
			type: "text",
			text: chars.join( '' ),
			location: location(),
		};
	}

NonOpeningChar
	= [^\{\\]

// Note: Not sure if should error or just let you put a backslash at the end.
EscapedChar
	= "\\" c:.? {
		return c;
	}

TagOpen
	= "{" tagName:TagName attrs:(Space Attribute)* Space? "}" {
		return {
			type: "tagOpen",
			tagName: tagName,
			attributes: attrs.map( function( pair ) { return pair[ 1 ]; } ),
			location: location(),
		};
	}

Space
	= $ [ \t\r\n]+

TagClose
	= "{/" tagName: TagName "}" {
		return {
			type: "tagClose",
			tagName: tagName,
			location: location(),
		};
	}

TagName
	= $ TagNameChar+

// This allows for all the shortcuts to be in place, but doesn't actually do anything about them...
TagNameChar
	= [^ \}]

Attribute
	= name:AttributeName "=" value:AttributeValue {
		return {
			name: name,
			value: value,
		};
	}

AttributeValue
	= QuotedAttributeValue / UnquotedAttributeValue

AttributeName
	= $ [^ }=]+

UnquotedAttributeValue
	= $ [^ }'"]*

QuotedAttributeValue
	= value:('"' $[^"]* '"' / "'" $[^']* "'") { return value[1]; }
```


#### TagOpen with Automatic Shortcut Support

```
TagOpen
	= "{" tagName:TagNameWithShortcuts attrs:(Space Attribute)* Space? "}" {
		var attributes = attrs.map( function( pair ) { return pair[ 1 ]; });
		var idFromAttrs = attributes.find( function( entry ) { return entry.name === 'id'; });
		var valueFromAttrs = attributes.find( function( entry ) { return entry.name === 'value'; });

		if( tagName.id ) {
			if( idFromAttrs ) idFromAttrs.value = tagName.id;
			else attributes.push({ name: 'id', value: tagName.id });
		}

		if( tagName.value ) {
			if( valueFromAttrs ) valueFromAttrs.value = tagName.value;
			else attributes.push({ name: 'value', value: tagName.value });
		}

		return {
			type: "tagOpen",
			tagName: tagName.name,
			attributes: attributes,
			location: location(),
		};
	}

TagNameWithShortcuts
	= name:($ TagNameValueChars+) shortcuts:(IdShortcut / ValueShortcut)* {
		var id, value;

		shortcuts.forEach(function(s) {
			if( s.type === 'id' ) id = s.value;
			else if( s.type === 'value' ) value = s.value;
		});

		return {
			name: name,
			id: id,
			value: value,
		};
	}

IdShortcut
	= "#" value:($ TagNameValueChars*) {
		return {
			type: 'id',
			value: value,
		};
	}

ValueShortcut
	= "=" value:($ TagNameValueChars*) {
		return {
			type: 'value',
			value: value,
		};
	}

TagNameValueChars = [^ \}=#]
```


#### PEG with Shortcut Support and using Map for Attributes

```
Corpus
	= entities:(TagOpen / TagClose / Text)* {
		return entities;
	}



//// Text

Text
	= chars:(NonOpeningChar / EscapedChar)+ {
		return {
			type: "text",
			text: chars.join( '' ),
			location: location(),
		};
	}

NonOpeningChar
	= [^\{\\]

// Note: Not sure if should error or just let you put a backslash at the end.
EscapedChar
	= "\\" c:.? {
		return c;
	}



//// Space

Space
	= $ [ \t\r\n]+



//// TagOpen

TagOpen
	= "{" tagName:TagNameWithShortcuts attrs:(Space Attribute)* Space? "}" {
		// Setting an explicit attribute WILL override the shortcuts.
		var attributes = new Map(attrs);

		if( tagName.id && ! attributes.has( 'id' ) ) {
			attributes.set( 'id', tagName.id );
		}

		if( tagName.value && ! attributes.has( 'value' ) ) {
			attributes.set( 'value', tagName.value );
		}

		return {
			type: "tagOpen",
			tagName: tagName.name,
			attributes: attributes,
			location: location(),
		};
	}

TagNameWithShortcuts
	= name:($ TagNameValueChars+) shortcuts:(IdShortcut / ValueShortcut)* {
		var id, value;

		shortcuts.forEach(function(s) {
			if( s.type === 'id' ) id = s.value;
			else if( s.type === 'value' ) value = s.value;
		});

		return {
			name: name,
			id: id,
			value: value,
		};
	}

IdShortcut
	= "#" value:($ TagNameValueChars*) {
		return {
			type: 'id',
			value: value,
		};
	}

ValueShortcut
	= "=" value:($ TagNameValueChars*) {
		return {
			type: 'value',
			value: value,
		};
	}

TagNameValueChars = [^ }=#]



//// TagClose

TagClose
	= "{/" tagName:TagNameWithShortcuts "}" {
		// NOTE: You can include shortcuts in the closing tag, but they will be ignored.
		return {
			type: "tagClose",
			tagName: tagName.name,
			location: location(),
			text: text(),
		};
	}



//// Attributes

Attribute = (KeyValueAttribute / BooleanAttribute)

KeyValueAttribute
	= name:AttributeName "=" value:AttributeValue {
		return [ name, value ];
	}

BooleanAttribute
	= name:AttributeName {
		return [ name, true ];
	}

AttributeValue
	= QuotedAttributeValue / UnquotedAttributeValue

AttributeName
	= $ [^ }=]+

UnquotedAttributeValue
	= $ [^ }'"]*

QuotedAttributeValue
	= value:('"' $[^"]* '"' / "'" $[^']* "'") { return value[1]; }
```

#### Revision

Added `/` to the list of characters not allowed in attr and tag names, and just for extra assurance, I put TagClose first.

```
Corpus
	= entities:(TagClose / TagOpen / Text)* {
		return entities;
	}



//// Text

Text
	= chars:(NonOpeningChar / EscapedChar)+ {
		return {
			type: "text",
			text: chars.join( '' ),
			location: location(),
		};
	}

NonOpeningChar
	= [^\{\\]

// Note: Not sure if should error or just let you put a backslash at the end.
EscapedChar
	= "\\" c:.? {
		return c;
	}



//// Space

Space
	= $ [ \t\r\n]+



//// TagOpen

TagOpen
	= "{" tagName:TagNameWithShortcuts attrs:(Space Attribute)* Space? "}" {
		// Setting an explicit attribute WILL override the shortcuts.
		var attributes = new Map(attrs.map(function(a) { return a[1]; }));

		if( tagName.id && ! attributes.has( 'id' ) ) {
			attributes.set( 'id', tagName.id );
		}

		if( tagName.value && ! attributes.has( 'value' ) ) {
			attributes.set( 'value', tagName.value );
		}

		return {
			type: "tagOpen",
			tagName: tagName.name,
			attributes: attributes,
            text: text(),
			location: location(),
		};
	}

TagNameWithShortcuts
	= name:($ TagNameValueChars+) shortcuts:(IdShortcut / ValueShortcut)* {
		var id, value;

		shortcuts.forEach(function(s) {
			if( s.type === 'id' ) id = s.value;
			else if( s.type === 'value' ) value = s.value;
		});

		return {
			name: name,
			id: id,
			value: value,
		};
	}

IdShortcut
	= "#" value:($ TagNameValueChars*) {
		return {
			type: 'id',
			value: value,
		};
	}

ValueShortcut
	= "=" value:($ TagNameValueChars*) {
		return {
			type: 'value',
			value: value,
		};
	}

TagNameValueChars = [^/ }=#]



//// TagClose

TagClose
	= "{/" tagName:TagNameWithShortcuts "}" {
		// NOTE: You can include shortcuts in the closing tag, but they will be ignored.
		return {
			type: "tagClose",
			tagName: tagName.name,
			location: location(),
			text: text(),
		};
	}



//// Attributes

Attribute = (KeyValueAttribute / BooleanAttribute)

KeyValueAttribute
	= name:AttributeName "=" value:AttributeValue {
		return [ name, value ];
	}

BooleanAttribute
	= name:AttributeName {
		return [ name, true ];
	}

AttributeValue
	= QuotedAttributeValue / UnquotedAttributeValue

AttributeName
	= $ [^/ }=]+

UnquotedAttributeValue
	= $ [^/ }'"]*

QuotedAttributeValue
	= value:('"' $[^"]* '"' / "'" $[^']* "'") { return value[1]; }
```
