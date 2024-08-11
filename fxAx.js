var fxAx = function(){

	const nMoveIdxValue = 9999;
	const self = this;
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

	if (!("Proxy" in window)) {
	  console.warn("Your browser doesn't support Proxies.");
	  return;
	}

	var oBindingElementObject = {};
	var oBindingTargetList = {};

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

	self.observable = function(oTargetObject){
		
		if (!oTargetObject){
			oTargetObject = {};
		}

		var targetProxy = new Proxy(oTargetObject, {
		 set: function (target, key, value) {

			  console.log(`${key} set to ${value}`);
			  target[key] = value;

			  if (oBindingElementObject && oBindingElementObject[key]){
				 	for (let i=0; i<oBindingElementObject[key].length; i++){
				 		console.log(oBindingElementObject[key][i]);
				 		oBindingElementObject[key][i].innerHTML = value;
				 	}
			  }

			  return true;
		  }
		});

		return targetProxy;

	} // end of observable
	
	self.observableList = function(oTargetList, sElementId){
		
		var self = this;
		self.bIsEditMode = false;

		var editRow = function(oValueObject, oRowElement){
		  
		  for (let key in oValueObject){

		  	let oCol = oRowElement.getElementsByClassName("lt-" + key);
		  	for (let i=0; i<oCol.length; i++){
		  		oCol[i].innerHTML = oValueObject[key];
		  	}
		  	
		  } // end for 

		}
		var cloneRow = function(oValueObject) {

			var table = document.getElementsByClassName(sElementId)[0]; // find table to append to
		  var row = table.querySelector("#rowToClone"); // find row to copy
		  var clone = row.cloneNode(true); // copy children too

		  clone.id = "table-id"; // change id or other attributes/contents
		  clone.classList.remove('d-none');
		  console.log('clone');
		  console.log(clone);
		  editRow(oValueObject, clone);
		  table.appendChild(clone); // add new row to end of table
		}

		if (!oTargetList){
			oTargetList = [];
		}
		
		// a proxy for our array
		self.proxy = new Proxy(oTargetList, {
		  deleteProperty: function(target, property) {

		  	let nProperty = parseInt(property);
				delete target[property];
				if (nLastMoveIdx == nMoveIdxValue){
					document.getElementsByClassName(sElementId)[0].deleteRow(nProperty + 1);
				}else{
					document.getElementsByClassName(sElementId)[0].deleteRow(nLastMoveIdx + 1);
				}
				
				console.log("Deleted %s", nLastMoveIdx);
				nLastMoveIdx = nMoveIdxValue;
				return true;

		  },
		  set: function(target, property, value, receiver) {      

		  	// initialize variable
				target[property] = value;
				nProperty = parseInt(property);

				if (property != 'length'){

					console.log("Set %s to %o", property, value);
					// check if add

					if (receiver.length == nProperty + 1 && self.bIsEditMode==false){

						let oTableBody = document.getElementsByClassName(sElementId)[0];
						let oTableRow = oTableBody.querySelector("#table-id");

						cloneRow(value);
						//Set 0 to {a: 1, b: 2, c: 3, d: 4}

					}else{
						// a change detected
						// array move 1 -> 0, 2 -> 1
						// get last move for delete
						
						if (self.bIsEditMode){

							let oTableBody = document.getElementsByClassName(sElementId)[0];
							let oTableRow = oTableBody.querySelectorAll("#table-id")[nProperty];
							editRow(value, oTableRow);
							self.bIsEditMode = false;

						}else{
							if (nLastMoveIdx > nProperty){
								nLastMoveIdx = nProperty;
							}							
						}

						
					}

				}
				return self.proxy;
		  }
		});

	} // end of observableList
	
	self.applyBindings = function(oModelObject, oRootElement){

		self.oModelObject = oModelObject;

		var applyTextBinding = function(sModelKey, sModelValue, sElementId){

			// initialize model target object default value
			self.oModelObject[sModelKey] = sModelValue;

			// register dom element with model key
			if (!oBindingElementObject[sModelKey]){
				oBindingElementObject[sModelKey] = [];
			}
			oBindingElementObject[sModelKey].push(document.getElementsByClassName(sElementId)[0]);

		} // end of applyTextBinding

		var applyListBinding = function(sModelKey, oModelList, sElementId){

			// initialize model target object default value
			oProxyModelObject.datalist[sModelKey] = new self.observableList(oModelList, sElementId);

			// register dom element with model key
			if (!oBindingElementObject[sModelKey]){
				oBindingElementObject[sModelKey] = [];
			}
			oBindingElementObject[sModelKey].push(document.getElementsByClassName(sElementId)[0]);

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
					oModelObject[sModelKey] = "";
				}
				applyTextBinding(sModelKey, oModelObject[sModelKey], sElementId);
				break;
			case "l":
				if (!oModelObject[sModelKey]){
					oModelObject[sModelKey] = [];
				}
				if (typeof oModelObject[sModelKey] == 'string'){
					oModelObject[sModelKey] = [];
				}
				applyListBinding(sModelKey, oModelObject[sModelKey], sElementId);
				break;
			case "s":
				if (!oModelObject[sModelKey]){
					oModelObject[sModelKey] = "";
				}
				applyTextBinding(sModelKey, oModelObject[sModelKey], sElementId);
				break;
			case "f":
				if (!oModelObject[sModelKey]){
					oModelObject[sModelKey] = "";
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