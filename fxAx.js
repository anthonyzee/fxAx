var fxAx = function(){

	const nMoveIdxValue = 9999;
	const self = this;
	const oTargetObjectList = {};
	const sTargetObjectPrefix = "d";
	const sTargetListPrefix = "l";
	var nTargetObjectIndex = 0;
	var nTargetListIndex = 0;
	var oBindingElementObject = {};
	var oBindingTargetList = {};

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

	self.observable = function(targetValue){
		
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

	self.observableList = function(oTargetList){
		
		var self1 = this;
		self1.sTargetListName = sTargetObjectPrefix + nTargetListIndex;
		self1.sElementId = "";
		nTargetListIndex++;
		self1.bIsEditMode = false;

		var cloneRow = function(oValueObject) {

		  var tables = document.getElementsByClassName(self1.sElementId); // find table to append to
		  if (tables.length == 0){
		  	return;
		  }
		  var table = tables[0];
		  var row = table.querySelector("#"+self1.sElementId+"-row"); // find row to copy
		  var clone = row.cloneNode(true); // copy children too

		  clone.id = "table-id"; // change id or other attributes/contents
		  clone.classList.remove('d-none');
		  self.editRow(oValueObject, clone);
		  table.appendChild(clone); // add new row to end of table
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
					document.getElementsByClassName(self1.sElementId)[0].deleteRow(nProperty + 1);
				}else{
					document.getElementsByClassName(self1.sElementId)[0].deleteRow(nLastMoveIdx + 1);
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

						let oTableBodys = document.getElementsByClassName(self1.sElementId);
						if (oTableBodys.length == 0){
							return self1.d;
						}
						let oTableBody = oTableBodys[0];
						let oTableRow = oTableBody.querySelector("#" + self1.sElementId + "-list");

						cloneRow(value);
						//Set 0 to {a: 1, b: 2, c: 3, d: 4}

					}else{
						// a change detected
						// array move 1 -> 0, 2 -> 1
						// get last move for delete
						
						if (self1.bIsEditMode){

							let oTableBodys = document.getElementsByClassName(self1.sElementId);
							if (oTableBodys.length == 0){
								return self1.d;
							}
							let oTableBody = oTableBodys[0];
							let oTableRow = oTableBody.querySelectorAll("#table-id")[nProperty];
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

		self1.d.set_element_id = function(sElementId){
			return self1.sElementId = sElementId;
		}
		self1.d.set_edit_mode = function(pIsEditMode){
			return self1.bIsEditMode = pIsEditMode;
		}		
		return function(oTargetList){

			if (oTargetList){
				self1.d.splice(0,self1.d.length);
				self1.d = oTargetList;
			}else{
				return self1.d;	
			}

		};

	} // end of observableList
	
	self.applyBindings = function(oModelObject, oRootElement){

		self.oModelObject = oModelObject;

		var applyTextBinding = function(sModelKey, sModelValue, sElementId){

			sModelValue(null,sModelKey);

			// register dom element with model key
			if (!oBindingElementObject[sModelKey]){
				oBindingElementObject[sModelKey] = [];
			}
			oBindingElementObject[sModelKey].push(document.getElementsByClassName(sElementId)[0]);

		} // end of applyTextBinding

		var applyListBinding = function(sModelKey, oModelList, sElementId){

			oModelList().set_element_id(sElementId);
			// register dom element with model key
			if (!oBindingElementObject[sModelKey]){
				oBindingElementObject[sModelKey] = [];
			}
			oBindingElementObject[sModelKey].push(document.getElementsByClassName(sElementId)[0]);
			oBindingTargetList[sModelKey] 

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