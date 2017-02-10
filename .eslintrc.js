module.exports = {
	"extends": [
    "eslint:recommended",
    "plugin:import/errors",
    "plugin:import/warnings",
    "plugin:flowtype/recommended"
	],
	"plugins": [
	  "flowtype",
	  "import"
	],
	"parser": "babel-eslint",
	"parserOptions": {
	  "ecmaVersion": 6,
	  "sourceType": "module",
	  "ecmaFeatures": {
	    "jsx": false,
	    "impliedStrict": true,
	    "modules": true
	  }
	},
	"env": {
	  "es6": true,
	  "commonjs": true,
	},
	"rules": {
	  "strict": 0
	}
};
