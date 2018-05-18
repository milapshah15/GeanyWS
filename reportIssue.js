//set the description
current.description = producer.incident_description + "\n" + "Reach me by: " + producer.Communication_mode;

//Read the parameter
var gURI = new GlideURI();
var templateID = gURI.get('template_id'); // Get the template ID for the template requested

//Get the template ID from the url to know where is it calling from
var templateGr = new GlideRecord('sys_template');
templateGr.get(templateID);
current.applyTemplate(templateGr.getValue('name'));




    

