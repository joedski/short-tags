
import lex from './lexer';
import treeify from './treeifier';

export function parse( text ) {
	return treeify( lex( text ) );
}
