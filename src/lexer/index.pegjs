/**
 * A lexer to parse the raw text into nodes:
 * - text
 * - tagOpen
 * - tagClose
 */

/**
 * Type supplied by PEGJS:
 *
 * Location = {
 *   start: {
 *     column: number,
 *     line: number,
 *     offset: number,
 *   },
 *   end: {
 *     column: number,
 *     line: number,
 *     offset: number,
 *   },
 * }
 */

/**
 * Corpus = Array<TagClose | TagOpen | Text>
 */
Corpus
	= entities:(TagClose / TagOpen / Text)* {
		return entities;
	}



//// Text

/**
 * Text = {
 *   type: 'text',
 *   text: string,
 *   sourceText: string,
 *   location: Location,
 * }
 */
Text
	= chars:(NonOpeningChar / EscapedChar)+ {
		return {
			type: "text",
			text: chars.join( '' ),
			// sourceText contains escape sequences, too.
			sourceText: text(),
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

/**
 * TagOpen = {
 *   type: 'tagOpen',
 *   tagName: string,
 *   attributes: Map<string, string>,
 *   sourceText: string,
 *   location: Location
 * }
 */
TagOpen
	= "{" tagName:TagNameWithShortcuts attrs:(Space Attribute)* Space? closingSlash:"/"? "}" {
		// Setting an explicit attribute WILL override the shortcuts.
		var attributes = new Map(attrs.map(function( a ) { return a[1]; }));

		if( tagName.id && ! attributes.has( 'id' ) ) {
			attributes.set( 'id', tagName.id );
		}

		if( tagName.value && ! attributes.has( 'value' ) ) {
			attributes.set( 'value', tagName.value );
		}

		return {
			type: closingSlash ? "tagSelfClosing" : "tagOpen",
			tagName: tagName.name,
			attributes: attributes,
      sourceText: text(),
			location: location(),
		};
	}

TagNameWithShortcuts
	= name:($ TagNameValueChars+) shortcuts:(IdShortcut / ValueShortcut)* {
		var id, value;

		shortcuts.forEach(function( s ) {
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

TagNameValueChars = [^/ {}=#]



//// TagClose

/**
 * TagClose = {
 *   type: 'tagClose',
 *   tagName: string,
 *   sourceText: string,
 *   location: Location,
 * }
 */
TagClose
	= "{/" tagName:TagNameWithShortcuts "}" {
		// NOTE: You can include shortcuts in the closing tag, but they will be ignored.
		return {
			type: "tagClose",
			tagName: tagName.name,
			location: location(),
			sourceText: text(),
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
