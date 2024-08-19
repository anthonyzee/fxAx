var fxAx = function(){

	const nMoveIdxValue = 9999;
	const self = this;
	const oTargetObjectList = {};
	const sTargetObjectPrefix = "d";
	const sTargetListPrefix = "l";
	var nTargetObjectIndex = 0;
	var nTargetListIndex = 0;
	var oBindingElementObject = {};

	var targetProxy = new Proxy(oTargetObjectList, {
	 set: function (target, key, value) {

		  console.log(`${key} set to ${value}`);
		  target[key] = value;

		  if (oBindingElementObject && oBindingElementObject[key]){
			 	for (let i=0; i<oBindingElementObject[key].length; i++){
			 		oBindingElementObject[key][i].innerHTML = value;
			 	}
		  }

		  return true;
	  }
	});

	var oProxyModelObject = {
		"data": {},
		"datalist": {}
	};
	var nLastMoveIdx = nMoveIdxValue;

	self.docReady = function(fn) {
	  // see if DOM is already available
	  if (document.readyState === "complete" || document.readyState === "interactive") {
	      // call on next available tick
	      setTimeout(fn, 1);
	  } else {
	      document.addEventListener("DOMContentLoaded", fn);
	  }
	}    

	self.editRow = function(oValueObject, oRowElement){
	  
	  for (let key in oValueObject){

	  	let oCol = oRowElement.getElementsByClassName("lt-" + key);
	  	for (let i=0; i<oCol.length; i++){
	  		oCol[i].innerHTML = oValueObject[key];
	  	}
	  	
	  } // end for 

	}

	if (!("Proxy" in window)) {
	  console.warn("Your browser doesn't support Proxies.");
	  return;
	}

	var getAllChildElementIds = function(element, ids = []) {

	  // Check if the current element has an ID and add it to the list
	  if (element.classList.length > 0) {
	    ids.push(element.classList[0]);
	  }

	  // Recursively search through all child elements
	  for (let child of element.children) {
	    getAllChildElementIds(child, ids);
	  }

	  return ids;

	} // end of getAllChildElementIds

	var observable = function(targetValue){
		
		var self0=this;
		self0.sTargetObjectName = sTargetObjectPrefix + nTargetObjectIndex;
		self0.sElementId = self0.sTargetObjectName;
		nTargetObjectIndex++;

		if (targetValue){
			oTargetObjectList[self0.sTargetObjectName] = targetValue;
		}

		return function(targetValue, sElementId){

			if (sElementId){
				self0.sElementId = sElementId;
			}
			if (!targetValue){
				return oTargetObjectList[self0.sTargetObjectName];
			}

			targetProxy[self0.sElementId] = targetValue;

		};

	} // end of observable

	self.observable = function(targetValue){
		return new observable(targetValue);
	}

	var observableList = function(oTargetList){
		
		const self1 = this;
		const sTemplateRowId = "table-row-id";

		var oElementBodyObject;
		var oElementListObject;
		var oElementRowObject;

		self1.sTargetListName = sTargetObjectPrefix + nTargetListIndex;
		self1.sElementId = "";
		self1.sModelKey = "";
		nTargetListIndex++;
		self1.bIsEditMode = false;

		var cloneRow = function(oValueObject) {

		  if (!oElementRowObject){
		  	return;
		  }
		  var clone = oElementRowObject.cloneNode(true); // copy children too

		  clone.id = sTemplateRowId; // change id or other attributes/contents
		  clone.classList.remove('d-none');
		  self.editRow(oValueObject, clone);
		  oElementBodyObject.appendChild(clone); // add new row to end of table
		}

		if (!oTargetList){
			oTargetList = [];
		}
		
		// a proxy for our array
		self1.d = new Proxy(oTargetList, {
		  deleteProperty: function(target, property) {

		  	let nProperty = parseInt(property);
				delete target[property];
				if (nLastMoveIdx == nMoveIdxValue){
					oElementBodyObject.deleteRow(nProperty + 1);
				}else{
					oElementBodyObject.deleteRow(nLastMoveIdx + 1);
				}
				
				console.log("Deleted %s", nLastMoveIdx);
				nLastMoveIdx = nMoveIdxValue;
				return true;

		  },
		  set: function(target, property, value, receiver) {      

		  	// initialize variable
				target[property] = value;
				nProperty = parseInt(property);

				if (property != 'length' && property != 'get_name' && property != 'set_edit_mode'){

					console.log("Set %s to %o", property, value);
					// check if add
					if (receiver.length == nProperty + 1 && self1.bIsEditMode==false){

						if (!oElementBodyObject){
							return self1.d;
						}

						cloneRow(value);
						//Set 0 to {a: 1, b: 2, c: 3, d: 4}

					}else{
						// a change detected
						// array move 1 -> 0, 2 -> 1
						// get last move for delete
						
						if (self1.bIsEditMode){

							let oTableRow = oElementListObject.querySelectorAll("#" + sTemplateRowId)[nProperty];
							console.log(oTableRow);
							self.editRow(value, oTableRow);
							self1.bIsEditMode = false;

						}else{
							if (nLastMoveIdx > nProperty){
								nLastMoveIdx = nProperty;
							}							
						}

						
					}

				}
				return self1.d;
		  }
		});
	
		return function(oTargetList, bIsEditMode, sElementId){

			if (typeof bIsEditMode == 'boolean'){
				self1.bIsEditMode = bIsEditMode;
			}
			if (sElementId){

				let sPartId = sElementId.split('-');
				let sModelKey = sPartId[1];
				let sModelType = sPartId[0];

				self1.sElementId = sElementId;
				self1.sModelKey = sModelKey;

				if (oBindingElementObject[sModelKey] && oBindingElementObject[sModelKey].length > 0){
					oElementBodyObject = oBindingElementObject[sModelKey][0];
					oElementRowObject = oElementBodyObject.querySelector("#"+self1.sElementId+"-row"); // find row to copy\
					oElementListObject = document.getElementById(self1.sElementId + "-list");
				}

			}
			if (oTargetList){
				self1.d.splice(0,self1.d.length);
				self1.d = oTargetList;
			}else{
				return self1.d;	
			}

		};

	} // end of observableList
	
	self.observableList = function(oTargetList){
		return new observableList(oTargetList);
	}

	self.applyBindings = function(oModelObject, oRootElement){

		self.oModelObject = oModelObject;

		var applyTextBinding = function(sModelKey, sModelValue, sElementId){

			sModelValue(null,sModelKey);

			// register dom element with model key
			if (!oBindingElementObject[sModelKey]){
				oBindingElementObject[sModelKey] = [];
			}

			let oElementList = oRootElement.getElementsByClassName(sElementId);

			if (oElementList.length == 0){
				console.log("unable to bind element " + sElementId + ". Element not found.");
			}else{
				for (let i = 0; i<oElementList.length; i++){
					oBindingElementObject[sModelKey].push(oElementList[i]);
				}
			}
			
		} // end of applyTextBinding

		var applyListBinding = function(sModelKey, oModelList, sElementId){

			// register dom element with model key
			if (!oBindingElementObject[sModelKey]){
				oBindingElementObject[sModelKey] = [];
			}

			let oElementList = oRootElement.getElementsByClassName(sElementId);

			if (oElementList.length == 0){
				console.log("unable to bind element " + sElementId + ". Element not found.");
			}else{
				for (let i = 0; i<oElementList.length; i++){
					oBindingElementObject[sModelKey].push(oElementList[i]);
				}
			}

			oModelList(null,null,sElementId)

		} // end of applyTextBinding

		const allIds = getAllChildElementIds(oRootElement);
	
		for (let i = 0; i< allIds.length; i++){

			let sElementId = allIds[i];
			let sPartId = sElementId.split('-');
			let sModelKey = sPartId[1];
			let sModelType = sPartId[0];

			switch (sModelType){
			case "t":
				if (!oModelObject[sModelKey]){
					oModelObject[sModelKey] = new self.observable();
				}
				applyTextBinding(sModelKey, oModelObject[sModelKey], sElementId);
				break;
			case "l":
				if (!oModelObject[sModelKey]){
					oModelObject[sModelKey] = new self.observableList();
				}
				if (typeof oModelObject[sModelKey] == 'string'){
					oModelObject[sModelKey] = new self.observableList();
				}
				applyListBinding(sModelKey, oModelObject[sModelKey], sElementId);
				break;
			case "s":
				if (!oModelObject[sModelKey]){
					oModelObject[sModelKey] = new self.observable();
				}
				applyTextBinding(sModelKey, oModelObject[sModelKey], sElementId);
				break;
			case "f":
				if (!oModelObject[sModelKey]){
					oModelObject[sModelKey] = new self.observable();
				}
				applyTextBinding(sModelKey, oModelObject[sModelKey], sElementId);
				break;
			default:
				// do nothing
			};
		}; // end for loop

		oProxyModelObject.data = self.observable(oModelObject);

		return oProxyModelObject;

	} // end of applyBindings
	
} // end of fxAx