(function () {
        /* populate the 'data' object */
        /* e.g., data.table = $sp.getValue('table'); */
        if (input && input.action == 'play') {
            try {

                var attachmentRec = new GlideRecord("sys_attachment");

                attachmentRec.get('6c6d0af0dbe11740b2e2d34b5e961970');

                var request = new sn_ws.RESTMessageV2();
                request.setHttpMethod('post');
                request.setEndpoint('https://stream.watsonplatform.net/speech-to-text/api/v1/recognize');
                request.setBasicAuth("ced99b7b-7a32-449b-a896-6786c6419f4d", "vdmzXuDma3lS");
                request.setRequestBodyFromAttachment('6c6d0af0dbe11740b2e2d34b5e961970');
                request.setRequestHeader("Content-Type", attachmentRec.content_type);

                request.setRequestHeader("Accept", "application/json");

                var response = request.execute();
                var httpResponseStatus = response.getStatusCode();
                var httpResponseContentType = response.getHeader('Content-Type');
                var httpResponseBody = response.getBody();
                var responseObj = JSON.parse(httpResponseBody);

                return {
                    alternatives: this.parseIntents(responseObj['alternatives'], 'confidence', 'transcript'),
                    response: httpResponseBody
                };
            } catch (ex) {
                gs.error(ex + ': ' + httpResponseBody);
                return ex;
            }
        }
})();