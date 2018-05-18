(function executionBotAction(params) {
	
	//Get the search sources for the portal
	var m2mSearchSourceGR = new GlideRecord("m2m_sp_portal_search_source");
	m2mSearchSourceGR.addQuery("sp_portal", '90a641dddb7a07803d7958a8dc9619e5');
	m2mSearchSourceGR.query();
	while(m2mSearchSourceGR.next()) {
		getResults(m2mSearchSourceGR.getElement("sp_search_source").getRefRecord(),params['searchTerm']);
	}
	
})(params);


function getResults(gr,searchTerm) {
	
	var max_items_per_source = 3;
	
	//Check if the user is allowed to see this source.
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

	if (gr.is_scripted_source) {
		var input = {};
		input.query = searchTerm;
		var evaluator = new GlideScopedEvaluator();
		var results = evaluator.evaluateScript(gr, "data_fetch_script", input);
		
		if(!results || results == null){
			results = [];
		}

		var maxCatItems = data.limit - 2;
		var count = 0;
		results.forEach(function(item) {				
			if(gr.getElement("advanced_typeahead_config").getDisplayValue() == "true"){
				item.templateID = "sp-typeahead-" + gr.getValue("id") + ".html";
			}
			
			if(count < max_items_per_source){
				data.results.push(item);
			}
			count++;
		});
	} else {
		var primaryField = gr.getValue("primary_display_field");
		var displayFields = gr.getValue("display_fields");

		var resultGR = new GlideRecordSecure(gr.getValue("source_table"));
		var condition = gr.getValue("condition");
		if (condition)
			resultGR.addEncodedQuery(condition);
		if (searchTerm)
			resultGR.addQuery('123TEXTQUERY321', searchTerm);
		resultGR.query();

		var searchTableCount = 0;
		while (resultGR.next() && searchTableCount < max_items_per_source) {
			if (!resultGR.canRead())
				continue;

			var secondaryValues = {};

			if (displayFields)
				displayFields.split(",").forEach(function(field) {
					var obj = getField(resultGR, field);
					secondaryValues[field] = obj;
				});

			var item = {
				primary: (primaryField) ? resultGR.getValue(primaryField) : resultGR.getDisplayValue(),
				sys_id: resultGR.getUniqueValue(),
				table: resultGR.getTableName(),
				fields: secondaryValues
			};

			if (gr.getElement("advanced_typeahead_config").getDisplayValue() == "true")
				item.templateID = "sp-typeahead-" + gr.getValue("id") + ".html";
			else {
				item.glyph = gr.getValue("typeahead_glyph");
				item.linkToPage = gr.getValue("page");
			}
			data.results.push(item);
			searchTableCount++;
		}
	}

	var pageGR = new GlideRecord("sp_page");
	if (pageGR.get(gr.getValue("page")))
		var pageID = pageGR.getValue("id");

	data.results.forEach(function(result) {
		if (result.url)
			return;


		if (pageID) {
			result.url = "?id=" + pageID;
			if (result.sys_id)
				result.url += "&sys_id=" + result.sys_id;
			if (result.table)
				result.url += "&table=" + result.table;
				} else {
					result.url = "";
				}
	});

}
