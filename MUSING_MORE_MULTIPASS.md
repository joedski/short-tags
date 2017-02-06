Musing: Even More Multiple Pass Parsing
=======================================

Outline:
- Lex string into relevant chars/strings:
	- EscapedChar = ("\\" .?)
	- TagOpenChar = "{"
	- TagCloseChar = "}"
	- CloseTagMarkerChar = "/"
	- SpaceChar = [ \t\r\n]
	- ValueMarkerChar = "="
	- SingleQuoteChar = '"'
	- DoubleQuoteChar = "'"
	- AnyChar = .

- Lex CharClasses into Entities
	- Entity = OpenTag / CloseTag / Text
	- OpenTag = TagOpenChar TagName (Space+ Attribute) Space* TagCloseChar
	- CloseTag = TagOpenChar CloseTagMarkerChar TagName TagCloseChar
	- Text = EscapedChar / AnyChar
	- TagName = ...
	- Attribute = ..

Only real problem I see with this approach is that Text is always matching only one char at a time, so you end up with a million Text entities.  I probably won't use that approach.
