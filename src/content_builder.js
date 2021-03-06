var DEBUG   = 0;
var fs 		= require('fs');
var fm 		= require('front-matter');
var md5 	= require('md5');
var moment 	= require('moment');
var chalk 	= require('chalk');

var build_audit = require('./build-audits');

function lowercaseFirstLetter(string) {
    return string.charAt(0).toLowerCase() + string.slice(1);
}

function getFrontmatter(f){
	// extract front-matter
	var tmpfm = fm( f );

	// Frontmatter in Markdown files are defined in "CamelCase". Convert to "lowerCamelCase"
	var frontMatter = {attributes:{}, body:tmpfm.body};
	var keys = Object.keys(tmpfm.attributes);
	keys.map( function(k){
		frontMatter.attributes[ lowercaseFirstLetter(k) ] = tmpfm.attributes[k];
	});
	//console.log('frontMatter', frontMatter);
	return frontMatter;
}

module.exports.generic = function(filename, language, config){
	var f = fs.readFileSync(filename).toString();
	var frontMatter = getFrontmatter(f);

	var meta = {
		url: filename.replace('arguments', '').replace('.md', '.html').split("/").pop(),
		guid: md5(frontMatter.body.trim())
	}
	return Object.assign({}, frontMatter.attributes, meta, {body:frontMatter.body.trim()} );
}

module.exports.article = function(filename, language, config){
	var f = fs.readFileSync(filename).toString();
	var frontMatter = getFrontmatter(f);
	//console.log('frontMatter', frontMatter);
	//console.log('frontMatter.attributes.title', frontMatter.attributes.title);
	//console.log('frontMatter.attributes.PublicDate', frontMatter.attributes.publicDate);

	// Publish?
	var now 	  = moment();
	now 		  = new moment("2017-08-15");
	var pubdate   = new moment(frontMatter.attributes.publicDate);
	var doPublish = pubdate.isSameOrBefore(now, 'day');

	//console.log(pubdate.format("MMMM Do, YYYY"), 'isSameOrBefore', now.format("MMMM Do, YYYY")  );

	if( doPublish ){
		console.log( chalk.green( pubdate.format("MMMM Do, YYYY")), 'isSameOrBefore', chalk.blue(now.format("MMMM Do, YYYY")), filename);
	}else{
		console.log( chalk.red(   pubdate.format("MMMM Do, YYYY"), 'isSameOrBefore'), chalk.blue(now.format("MMMM Do, YYYY")), chalk.red(filename) );
	}


	if( !doPublish ) return false;


	if( frontMatter.attributes.title === undefined){
		console.log('UNDEF frontMatter.attributes.title', Object.keys(frontMatter), Object.keys(frontMatter.attributes) );
	}

	frontMatter.attributes.title = frontMatter.attributes.title.replace(/_/g, " ");

	var extra = {
		coverImageHref: 'https://source.unsplash.com/random/1600x900',
		language: language,
		tags: [],
	}
	
	if( frontMatter.attributes.headerImage ){
		var id = frontMatter.attributes.headerImage.split('/').pop();
		extra.coverImageHref = 'https://source.unsplash.com/'+ id +'/1600x900';
	}

	// Display date
	if( DEBUG > 0 ) console.log('frontMatter.attributes.approvedDate', frontMatter.attributes.approvedDate);
	extra.documentDateISO	  = new moment(frontMatter.attributes.publicDate).toISOString();
	extra.documentDateDisplay = new moment(frontMatter.attributes.publicDate).format("MMMM Do, YYYY"); // 23 May 2016


	// Tags
	if( DEBUG > 2 ) console.log('frontMatter.attributes.tags', frontMatter.attributes.tags);
	if( frontMatter.attributes.tags ){
		frontMatter.attributes.tags = frontMatter.attributes.tags.replace(/;/g, ',');
		frontMatter.attributes.tags.split(",").map( function(itm){ 
			itm = itm.trim().replace(/ /g, "_");
			//extra.tags.push({name:itm.toUpperCase(), lcname:itm.toLowerCase(), link:"tags.html#"+ itm.toLowerCase() });
			extra.tags.push({name:itm.toUpperCase(), lcname:itm.toLowerCase(), link:"index.html#"+ itm.toLowerCase() });
			//console.log('extra.tags', itm);
		});
	}
	

	// Short
	if( !frontMatter.attributes.short ){
		frontMatter.attributes.short = '';
	}

	// Key-message
	extra.keymessage = frontMatter.body.trim().split(/_/g).slice(1,2);


	// Reference Access Date
	if( frontMatter.attributes.referenceAccessDate ){
		frontMatter.attributes.referenceAccessDate = new moment(frontMatter.attributes.referenceAccessDate).format("MMMM Do, YYYY"); // 23 May 2016
	}else{
		frontMatter.attributes.referenceAccessDate = '';
	}
	
	// get commit history
	var hist = build_audit(filename, language, config);

	var meta = Object.assign({}, frontMatter.attributes, hist, extra);

	var url  = filename.replace('arguments', '').replace('.md', '.html').split("/").pop();
	var body = frontMatter.body.trim();

	meta.guid = md5(body);

	//body = 'TEXT';

	if( DEBUG > 0 ) console.log('meta', meta);

	return {
		meta: meta,
		file: filename,
		url:  url,
		text: body
	}
	
}