Short Tags
==========

Simple parser for `{curly-style}` short tags.  They're not really any shorter than anything else despite the name, that's just what I've heard them called.

Parser could be trivially changed to support other delimiters.



Usage
-----

Basic usage is just importing the parser from the module.

ES6:

```js
import { parse } from 'short-tags';
const tree = parse( `{document="Foo Bar" variant=blagh}
This is some {important level=very}text{/important} with short tags!
There's a {link=www.example.com new-window}link to a place{/link} in here.` );
```

ES5:

```js
var parse = require( 'short-tags' ).parse;
var tree = parse(
	"{document='Foo Bar' variant=blagh}\n"
	+ "This is some {important level=very}text{/important} with short tags!\n"
	+ "There's a {link=www.example.com new-window}link to a place{/link} in here."
);
```

You'll get back a `Tree` which is an array of entities.  Mostly you'll see `text` and `tag` entities, the latter of which may have `children`, which itself is another `Tree`.  Iterate using standard Array methods!

```js
var documentProps = { title: '', variant: '' };

function textOfEntity( entity ) {
	switch( entity.type ) {
		case 'text': {
			return entity.text;
		}

		case 'tag': {
			return textOfTag( entity );
		}

		// Skip anything we don't recognize right now.
		default: return '';
	}
}

function textOfTag( tag ) {
	switch( tag.tagName ) {
		case 'document': {
			// Impurity alert! >:O
			// NOTE: Assigning a value to the tag-name is the same as
			// adding a `value=` attribute.
			documentProps.title = tag.attributes.value;
			documentProps.variant = tag.attributes.variant;

			// Document tag is config, so no output results from it.
			return '';
		}

		case 'important': {
			var level = tag.attributes.level || 'kinda';
			var contents = tag.children.map( textOfEntity );

			switch( level ) {
				default:
				case 'smidge':
					return '<em>' + contents + '</em>';

				case 'kinda':
					return '<em><strong>' + contents + '</strong></em>';

				case 'very':
					return '<big><em><strong>' + contents + '</strong></em></big>';
			}
		}

		case 'link': {
			var url = tag.attributes.value;
			var openInNewWindow = !! tag.attributes['new-window'];

			return (
				'<a href="' + url + '"'
				+ (
					openInNewWindow
						? ' target="_blank"'
						: ''
				)
				+ '>'
				+ tag.children.map( textOfEntity )
				+ '</a>'
			);
		}

		// Skip anything we don't recognize right now.
		default: return '';
	}
}

var html = tree.map( textOfEntity );
```


### Lexer and Treeifier

The Short Tags Parser is composed of two parts, the Lexer and the Treeifier.  The Lexer parses a string into a token stream, while the treeifier takes a token stream and turns it into a tree.

Currently the treeifier does not support streaming itself.

The Lexer is implemented as a PEGjs parser, and is very much the largest part of the entire thing.  The Treeifier is a simple stack-based thingerdoo.



Behavior
--------

The parser is meant to be forgiving of user input.  In particular, it displays the following behaviors:
- Open Tags which don't have a corresponding Close Tag are assumed to be Empty Tags.
- Close Tags which don't have a corresponding Open Tag are left in the Tree as is, to be handled later.


### Shortcuts

The parser supports two shortcuts, which are probably about the only thing which could be said to be short about this thing.

- Value: `{foo=bar}` is the same as writing `{foo value=bar}`.
- Id: `{foo#foobie}` is the same as writing `{foo id=foobie}`.

These can be combined, too: `{foo#foobie=bar}`.
