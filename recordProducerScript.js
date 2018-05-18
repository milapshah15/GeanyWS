function onLoad() {

	setTimeout(
	function(){
        
        //Get CI and Template ID from the URL.Validate the template
        var templateID = getParameterValue('template_id');
        var ga = new GlideAjax('GetCategoryName');
        ga.addParam('sysparm_name','getTemplate');
        ga.addParam('sysparm_id',templateID);
        ga.getXML(getTemplate);
        function getTemplate(response) {
            ans = response.responseXML.documentElement.getAttribute("answer");
            if (ans != '') {
                g_form.setValue('template_id',ans);
                g_form.setDisplay('on_behalf_of', false);
                g_form.setDisplay('business_service', false);
                g_form.setMandatory('business_service', false);
            }
        }
      
        g_form.setValue('cmdb_ci',getParameterValue('ci'));
		g_form.setDisplay('template_id', false);
		g_form.setDisplay('cmdb_ci', false);
		
	}, 1000);
	
}

function getParameterValue(paramName){
    var uri = top.location + '';
    var params = uri.split('?')[1].split('&');
	for(var i = 0; i < params.length; i++){
        var keyPair = params[i].split("=");
		if(keyPair[0] == paramName)
			return keyPair[1];
    }
    return '';
}