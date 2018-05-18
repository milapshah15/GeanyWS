(function(){
	//	var srchHelper =	new SurfSolrSearchPageHelper();
	//	srchHelper.retriveResults(data, options, $sp);
	
	
	// populate the 'data' variable
	data.q = $sp.getParameter('q');
	data.t = "Laptop" || options.searchTerm || $sp.getParameter('t');
	data.results = [];
	data.matching_catalogs = {};
	data.matching_knowledge_bases = {};
	data.matching_sc_categories = {};
	console.log('Search Term:' + options.searchTerm);
	if(input && input.t) {
		data.t = input.t;
	}

	var scores = {};
	if(!data.q) {
		return;
	}

	data.q = data.q.toLocaleLowerCase();

	var prefGr = new GlideRecord('u_esc_search_history');
	prefGr.initialize(); 
	prefGr.u_search_term = data.q;
	prefGr.u_user = gs.getUserID();
	prefGr.insert();

	data.contextual_search_sources = options.contextual_search_sources || (input && input.contextual_search_sources);
	options.facets = options.facets || '';

	var searchSourceGR;
	if (!data.contextual_search_sources) {
		data.searchType = data.t;
		searchSourceGR = new GlideRecord("sp_search_source");
		searchSourceGR.addQuery('id',data.searchType);
		searchSourceGR.query();
		if (searchSourceGR.next())
			data.contextual_search_sources = searchSourceGR.getValue("sys_id");
	} else {
		var contextualSearchSources = data.contextual_search_sources.split(",");
		if (contextualSearchSources.length == 1) {
			searchSourceGR = new GlideRecord("sp_search_source");
			if (searchSourceGR.get(contextualSearchSources[0]))
				data.searchType = searchSourceGR.getValue("id");
		} else {
			data.searchType = $sp.getParameter("t");
		}
	}

	var queryArr = [];
	var portalGr = $sp.getPortalRecord();
	var kbs = portalGr.getDisplayValue('u_kb_knowledge_bases');
	var catalogs = portalGr.getDisplayValue('u_sc_catalogs');
	if(!kbs) {
		kbs = portalGr.getDisplayValue('kb_knowledge_base');
	}
	if(!catalogs) {
		catalogs = portalGr.getDisplayValue('sc_catalog');
	}
	var fixCondition = ['type:"UD"','type:"APP"','type:"LOC"'];
	var analyticsQry = 'catalogs:"Analytics"';

	function addCondition(values, arr, type) {
		if(values) {
			values.split(',').forEach(function(value) {				
					arr.push(type + ':' + '"' + (value.trim()) +'"')
			});
		}
	}

	if(data.searchType == 'surf-bi-report-search-source') {
		fixCondition = [analyticsQry];
	} else if(data.searchType == 'surf-request-search-source') {
		fixCondition = [];
		addCondition(catalogs,fixCondition,'catalogs');	
	} else if(data.searchType == 'surf-kb-search-source') {
		fixCondition = [];
		addCondition(kbs,fixCondition,'knowledgeBase');		
	} else if(!data.searchType) {
		fixCondition.push(analyticsQry);
		addCondition(catalogs,fixCondition,'catalogs');
		addCondition(kbs,fixCondition,'knowledgeBase');
	} else {
		fixCondition = [];
	}
	if(fixCondition.length) {
		queryArr.push('(' + fixCondition.join(' OR ') + ')');
	}



	if (data.t)
		data.limit = options.max_group || 100;
	else
		data.limit = options.max_all || 100;

	data.limit  = 100;

	if(input && input.excluded_sc_catalogs){
		data.excluded_sc_catalogs = input.excluded_sc_catalogs;
	}

	if(input && input.sc_category && input.sc_category != ''){
		data.sc_category = input.sc_category;
	}

	//Gotta decide if we want to use the portal's sources, or use the defaults declared by
	//the sys property
	var useDefaultPortals;
	if (!$sp.getPortalRecord()) {
		useDefaultPortals = true;
	} else {
		var searchSourcesForPortalGR = new GlideRecord("m2m_sp_portal_search_source");
		searchSourcesForPortalGR.addQuery("sp_portal", $sp.getPortalRecord().getUniqueValue());
		searchSourcesForPortalGR.query();
		useDefaultPortals = searchSourcesForPortalGR.getRowCount() == 0;
	}

	data.resultTemplates = {};

	var externalSources = [];
	var internalSources = [];

	var srchSrcConfig = {	}
	var gr;
    var srchSrc;
    console.log('Test Milap' + useDefaultPortals);
	if (data.contextual_search_sources) {
		var contextualSearchSourceGR = new GlideRecord("sp_search_source");
		contextualSearchSourceGR.addQuery("sys_id", "IN", data.contextual_search_sources);
		contextualSearchSourceGR.query();				
		while (contextualSearchSourceGR.next()) {		
			data.searchType = contextualSearchSourceGR.getValue("id");
			data.resultTemplates["sp-search-source-" + contextualSearchSourceGR.getValue("id") + ".html"] = $sp.translateTemplate(contextualSearchSourceGR.getValue("search_page_template"));
			// getResults(contextualSearchSourceGR);
			setUpSource(contextualSearchSourceGR);
		}


	} else if (useDefaultPortals) {
		var defaultSearchSourceGR = new GlideRecord("sp_search_source");
		var defaultSearchSourceIDList = gs.getProperty("glide.service_portal.default_search_sources", "");
		defaultSearchSourceGR.addQuery("sys_id", "IN", defaultSearchSourceIDList);
		if (data.t)
			defaultSearchSourceGR.addQuery("id", data.t);
		defaultSearchSourceGR.query();
		while(defaultSearchSourceGR.next()) {
			data.resultTemplates["sp-search-source-" + defaultSearchSourceGR.getValue("id") + ".html"] = $sp.translateTemplate(defaultSearchSourceGR.getValue("search_page_template"));
			// getResults(defaultSearchSourceGR);
			setUpSource(defaultSearchSourceGR);
		}

	} else {
		var m2mSearchSourceGR = new GlideRecord("m2m_sp_portal_search_source");
		if (data.t)
			m2mSearchSourceGR.addQuery("sp_search_source.id", data.t);
		m2mSearchSourceGR.addQuery("sp_portal", $sp.getPortalRecord().getUniqueValue());
		m2mSearchSourceGR.query();
		while(m2mSearchSourceGR.next()) {
			var searchSourceGR = m2mSearchSourceGR.getElement("sp_search_source").getRefRecord();
			data.resultTemplates["sp-search-source-" + searchSourceGR.getValue("id") + ".html"] = $sp.translateTemplate(searchSourceGR.getValue("search_page_template"));
			// getResults(searchSourceGR);
			setUpSource(searchSourceGR);
		}
	}

	getSolrResult();
	
	getInternalResult();
	console.log("Milap" + JSON.stringify(data.results));

	function setUpSource (gr) {
		var userCriteria = new GlideSPUserCriteria();
		if (userCriteria.isEnabled()) {
			if (!userCriteria.userCanSeeSearchSource(gr.getUniqueValue()))
				return;
		} else {
			var gs = GlideSession.get();
			var searchSourceRoles = gr.getValue("roles");
			if (searchSourceRoles && !gs.hasRole(searchSourceRoles))
				return;
		}
		var extSrc = gr.getValue("u_external_search_source");
		srchSrc = (extSrc?extSrc+'-'+gr.getValue('sys_id'):'') || gr.getValue('sys_id')+'-';		

		if(srchSrc) {
			srchSrcConfig[srchSrc] = srchSrcConfig[srchSrc] || {};
			var config = srchSrcConfig[srchSrc];
			config.is_scripted_source = gr.is_scripted_source;
			config.primaryField = gr.getValue("primary_display_field");
			config.displayFields = gr.getValue("display_fields");
			config.sourceTable = gr.getValue("source_table");
			config.cxsSysId = gr.getValue("id"); 
			config.sys_id = gr.getValue("sys_id");			
			config.condition = gr.getValue("condition");
			if(gr.getValue("u_external_search_source")) {
				externalSources.push(srchSrc);
			} else {
				internalSources.push(srchSrc);
			}
		}
		return data;
	}


	function getInternalResult() {
		internalSources.forEach(function(source) {
			//	resultGR.addQuery('123TEXTQUERY321', data.q);		
			getResults(source, 'IR_AND_OR_QUERY='+data.q);
		});
	}

	function getSolrResult() {
		var nextStart = 0;
		if(input) {
			if(input.facets && input.facets.length) {
				var qArr = input.facets.map(function(el) {
					return el.name+ ':"' + (el.value.replace(/\"/g,''))+'"'
				});
				queryArr = queryArr.concat(qArr);
			}

			if(input.orGroup && input.orGroup.filters && input.orGroup.filters.length) {
				var qry = input.orGroup.filters.map(function(el) {
					if(input.orGroup.name=='catalogs_') {
						return input.orGroup.name + ':' + '*' + (el.label.replace(/\s/g,'?')) +'*';		
					} else {
						return input.orGroup.name + ':"' + (el.label.replace(/\"/g,'\\\"'))+'"';
					}
				}).join(' OR ');
				queryArr.push('(' + qry + ')');
			}
			nextStart = input.nextStart || 0;
		}

		queryArr.push(data.q);

		var queryParam=queryArr.join(' AND ');
		var start= nextStart;
		var rows=100;
		var searchTypeArray=externalSources.map(function(src){return src.substr(0,src.indexOf('-'))});
		var facetSelectionArray= options.facets.split(',') //; ['KB:kbCategory', 'KB:kbTags', 'KB:knowledgeBase', 'KB:author'];
		if(facetSelectionArray[0]) {
			facetSelectionArray.push('ALL:type','SC:catalogs');
		} else {
			facetSelectionArray[0] ='ALL:type';
			facetSelectionArray.push('SC:catalogs');
		}
		/*
		console.log('QP ' + queryParam);
		console.log('st ' + start);
		console.log('rw ' + rows);
		console.log('st ' + searchTypeArray);
		console.log('fsa ' + facetSelectionArray);
   */
		try{
			var responseBody=new SolrIntegrationHelper().doSolrBasicSearch(queryParam,start,rows,searchTypeArray,facetSelectionArray);

			var basicSearchResponse=new SolrBasicSearchJsonHelper(responseBody);
			data.solrResponse = {
				spellcheck: basicSearchResponse.parsedJson.spellcheck,
				facet_counts: basicSearchResponse.parsedJson.facet_counts,
				response: basicSearchResponse.parsedJson.response
			}
			getPortalResults(basicSearchResponse.parsedJson);
		} catch(e) {
			return;
		}
	}

	function getPortalResults(solrResults) {
		if(!solrResults || !solrResults.response) {
			return;
		}

		if(solrResults.response.numFound > (solrResults.response.start + 100)) {
			data.nextStart = solrResults.response.start + 100 + 1;
		}

		solrResults = solrResults.response.docs;
		solrResults.forEach(function(doc){
			scores[doc.sysId.split('-')[1]] = doc.score;
		});

		externalSources.forEach(function(sourceFull) {
			var source = sourceFull.substr(0,sourceFull.indexOf('-'));
			var sysIds = solrResults.filter(function(el){
				return el.type==source;
			}).map(function(el){
				return el.sysId.split('-')[1];
			});
			if(sysIds && sysIds.length) {
				getResults(sourceFull, 'sys_idIN'+sysIds);
			}
		});
	}

	function getResults(source, searchQry) {

		data.srchSrcConfig = srchSrcConfig;
		var searchTableCount = 0;
		var is_scripted_source =  srchSrcConfig[source].is_scripted_source 
		var primaryField =  srchSrcConfig[source].primaryField 
		var displayFields =  srchSrcConfig[source].displayFields 
		var sourceTable =  srchSrcConfig[source].sourceTable 
		var cxsSysId =  srchSrcConfig[source].cxsSysId;
		var sys_id =  srchSrcConfig[source].sys_id;
		var condition =  srchSrcConfig[source].condition;


		if (is_scripted_source) {
			var input = {};
			var query = {};
			query.query = searchQry;
			query.q = searchQry;


			var searchSourceGR = new GlideRecord("sp_search_source");
			searchSourceGR.addQuery('sys_id', sys_id);
			searchSourceGR.query();
			while(searchSourceGR.next()) {						

				var evaluator = new GlideScopedEvaluator();
				var results = evaluator.evaluateScript(searchSourceGR, "data_fetch_script", query);
				if(!results || results == null){
					results = [];
				}										

				results.forEach(function(item) {
					item.templateID = "sp-search-source-" + cxsSysId + ".html";
					item.score = scores[item.sys_id];
					data.results.push(item);
				});
			}
			return;
		}


		var resultGR = new GlideRecord(sourceTable);
		//		resultGR.addEncodedQuery(searchQry);
		// console.log(condition )
		// console.log(searchQry )
		if (condition)
			resultGR.addEncodedQuery(condition);
		resultGR.addEncodedQuery(searchQry);		
		resultGR.query();

		while (resultGR.next() && searchTableCount < data.limit) {			

			if (!resultGR.canRead())
				continue;

			var secondaryValues = {};

			if (displayFields)
				displayFields.split(",").forEach(function(field) {
					var obj = getField(resultGR, field);
					secondaryValues[field] = obj;
				});

			var result = {
				primary: (primaryField) ? resultGR.getValue(primaryField) : resultGR.getDisplayValue(),
				sys_id: resultGR.getUniqueValue(),
				table: resultGR.getTableName(),
				templateID: "sp-search-source-" +cxsSysId+ ".html",
				fields: secondaryValues,
				score : scores[resultGR.getUniqueValue()]
			};

			//set the matching catalogs and catagories for filtering purposes
			if(sourceTable+'' == 'sc_cat_item'){														
				var item_catalog = resultGR.getValue('sc_catalogs');
				//if the item is part of excluded catalogs then dont add it
				if(data.excluded_sc_catalogs && containsAny(item_catalog.split(','), data.excluded_sc_catalogs.split(',')))
					continue;

				result.catalogs = getCatalogDetails(item_catalog);
				//add catalog to matched catalogs list
				incrementItemInObject(data.matching_catalogs, item_catalog);

				//add the category to matched categories list
				var item_category = getCategoryDetails(resultGR.category.getRefRecord());
				addItemToObject(data.matching_sc_categories, item_category);
				result.category = item_category;
				
				var surfBIReportsHelper = new SurfBIReportsHelper();
				surfBIReportsHelper.setReportProperties(resultGR, result);	
			}
			else if(sourceTable+'' == 'kb_knowledge'){ 				
				var item_knowledge_base = resultGR.getValue('kb_knowledge_base');
				if(data.kb_knowledge_bases && containsAny(item_knowledge_base.split(','), data.excluded_kb_knowledge_bases.split(',')))
					continue;
				incrementItemInObject(data.matching_knowledge_bases, item_knowledge_base);
			}				

			data.results.push(result);
			searchTableCount++;
		}
	}



	function getCategoryDetails(category_gr){
		var opt = {
			id: category_gr.getUniqueValue(),
			sys_id: category_gr.getUniqueValue(),
			name: category_gr.getDisplayValue('title'),
			order: category_gr.getValue('order'),
			selected: false
		};
		return opt;
	}

	function getCatalogDetails(catalog_sys_ids){
		var catalogs = [];
		var cat_gr = new GlideRecord('sc_catalog');
		cat_gr.addQuery('sys_id','IN',catalog_sys_ids);
		cat_gr.query();
		while(cat_gr.next()){
			var cat = {
				id: cat_gr.getUniqueValue(),
				sys_id: cat_gr.getUniqueValue(),
				name: cat_gr.getDisplayValue('title')
			};	
			catalogs.push(cat);
		}
		return catalogs;
	}

	function addItemToObject(obj, item){
		if(item && item.id){
			obj[item.id] = item;
		}
	}

	function incrementItemInObject(obj, item_id){
		var item_id_arr = item_id.split(',');
		if(item_id_arr.length > 1){
			for(var i=0; i < item_id_arr.length; i++){
				incrementItemInObject(obj, item_id_arr[i]);
			}		
		}
		else{
			if(obj[item_id]){
				obj[item_id]++;
			}
			else{
				obj[item_id] = 1;
			}
		}	
	}


	function containsAny(source,target){
		var result = source.filter(function(item){ return target.indexOf(item) > -1;});   
		return (result.length > 0);  
	} 

	function getField(gr, name) {
		var f = {};
		f.display_value = gr.getDisplayValue(name);
		f.value = gr.getValue(name);
		var ge = gr.getElement(name);
		if (ge == null)
			return f;

		f.type = ge.getED().getInternalType();
		f.label = ge.getLabel();
		return f;
	}
	data.generic_request_item = gs.getProperty('surf.generic.request.item');
	data.generic_issue_item = gs.getProperty('surf.generic.issue.item');

})();