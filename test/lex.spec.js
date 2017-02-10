import test from 'ava';

import { lex } from '../lib';

test( `should interpret a run of text as a single text node`, t => {
	const text = `This is some text!  it is texty!`;
	const entities = lex( text );

	t.is(
		entities.length,
		1,
		`should only have a single entity`,
	);

	t.is(
		entities[ 0 ].type,
		'text',
		`that entity should have a type of text`,
	);

	t.is(
		entities[ 0 ].text,
		text,
		`should have the text that was passed in`,
	);
});

test( `should escape tagOpen properly`, t => {
	const text = `This text has an escapee: \\{I am not a tag!}`;
	const entities = lex( text );

	t.is( entities.length, 1, `should only have a single entity` );
	t.is( entities[ 0 ].type, 'text', `that entity should be a text entity` );
	t.is(
		entities[ 0 ].text,
		text.replace( /\\{/g, '{' ),
		`should output the escaped char as the char itself`,
	);
	t.is( entities[ 0 ].sourceText, text, `sourceText should match original text` );
});

test( `should create tagOpen entities`, t => {
	const text = `This text has a {tag} in it`;
	const entities = lex( text );

	t.is( entities.length, 3 );
	t.deepEqual( entities.map( e => e.type ), [ 'text', 'tagOpen', 'text' ] );
	t.is( entities[ 1 ].tagName, 'tag' );
});

test( `should create tagClose entities`, t => {
	const text = `This text has a {/tagClose} in it`;
	const entities = lex( text );

	t.is( entities.length, 3 );
	t.deepEqual( entities.map( e => e.type ), [ 'text', 'tagClose', 'text' ] );
	t.is( entities[ 1 ].tagName, 'tagClose' );
});

test( `should create tagOpen entities with attributes`, t => {
	// const text =
	// 	`This text has a {tag with=attributes and="more attributes" and-yet='more attributes' and-also="more'n you might think"} in it`;
	// const entities = lex( text );

	const entitiesBareAttrs = lex( `This text has a {tag with=anAttribute and=another} in it` );
	const entitiesDoubleQuotedAttrs = lex( `This text has a {tag with="an attribute" and="'nother"} in it` );
	const entitiesSingleQuotedAttrs = lex( `This text has a {tag with='an attribute' and='a "nother"'} in it` );

	// t.is( entities.length, 3 );
	// t.deepEqual( entities.map( e => e.type ), [ 'text', 'tagOpen', 'text' ] );
	// t.

	[
		[ 'Bare Attrs', entitiesBareAttrs ],
		[ 'Double Quoted Attrs', entitiesDoubleQuotedAttrs ],
		[ 'Single Quoted Attrs', entitiesSingleQuotedAttrs ]
	].forEach( ([ name, entities ]) => {
		t.is( entities.length, 3, `${name} should have 3 entities` );
		t.deepEqual( entities.map( e => e.type ), [ 'text', 'tagOpen', 'text' ], `${name} should have a text entity, a tagOpen entity, and a text entity` );
		t.is( entities[ 1 ].tagName, 'tag', `${name} should have a tag named 'tag'` );
		t.is( entities[ 1 ].attributes.size, 2, `${name}'s tag should have 2 attributes` );
	});
});
