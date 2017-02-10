
import { parse as lex } from './lexer';
import treeify from './treeifier';

function parse( text ) {
	return treeify( lex( text ) );
}

export {
	treeify,
	lex,
	parse,
};
