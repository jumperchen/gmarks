var GMARKS_COM_CONTRACTID = "@mozilla.org/gmarks/com/google;1";
var GMARKS_COM_CID = Components.ID('{f6c06be0-b631-11db-abbd-0800200c9a66}');
var GMARKS_COM_IID = Components.interfaces.nsIGMarksCom;
function nsGMarksCom() {
	this.wrappedJSObject = this;
}

const Ci = Components.interfaces;
nsGMarksCom.prototype = {
	GMS : null,
	passLoc : "chrome://gmarks",
	signature : "",
	OLD_BKMKLET_URL : "gmarksbookmarklet.com",
	BKMKLET_URL : "https://www.google.com/bookmarks/find?q=javascript&src=gmarksbkmklet",
	get manageOnlineURL() {
		return "https://www.google.com/bookmarks/";
	},
	setGMS : function (nsGMarksService) {
		this.GMS = nsGMarksService;
	},
	onRemoveBookmark : function (bkmk) {
		//dump("com.removebookmark: "+bkmk.url+"|"+bkmk.id+"\n");
		this.send('dlq=' + bkmk.id, true, bkmk);
	},
	onRenameLabel : function (oldLabel, newLabel) {
		this.send('op=modlabel&labels=' + encodeURIComponent(oldLabel + ',' + newLabel), true);
	},
	onRemoveLabel : function (rlabel) {
		this.send('op=modlabel&labels=' + encodeURIComponent(rlabel));
	},
	//the bookmark already has the labels added to it
	//Labels is an array of labels
	onAddLabelsToBookmark : function (bm, Labels) {
		this.sendUpdateBookmark(bm);
	},
	//bm already has had the label removed
	onRemoveLabelFromBookmark : function (bm, aLabel) {
		this.sendUpdateBookmark(bm);
	},
	//once again, bm has already been modified
	onRenameBookmark : function (bm, newTitle) {
		this.sendUpdateBookmark(bm);
	},
	sendUpdateBookmark : function (bm, async) {
		//var data='q='+encodeURIComponent(bm.url)+'&title='+encodeURIComponent(bm.title)
		//  +'&labels='+bm.labels+'&annotation='+bm.notes;
		var data = this.getSendData(bm);
		this.send(data, async, bm);
	},
	updateMultipleBookmarks : function (bkmks, i, time, tries) {
		var com = this;
		if (!time) {
			var d = new Date();
			time = d.valueOf();
		}
		if (!tries)
			tries = 0;
		if (i < bkmks.length) {
			var bm = bkmks[i];
			var req = this.getSendRequest();
			req.send(this.getSendData(bm));
			debug("Send update request for: " + bm.title + "\n");
			req.onreadystatechange = function (ev) {
				if (req.readyState == 4) {
					var status = -1;
					try {
						status = req.status;
					} catch (e) {
						dump("Request failed, could not get status info\n");
					}
					if (status == 200) {
						if (req.responseText && req.responseText.length > 1000)
							com.GMS.errorSendingBookmark(bm);
						else
							com.updateMultipleBookmarks(bkmks, i + 1, time, 0);
					} else { //Doesn't work
						tries++;
						if (tries < 5) { //Try it several of times
							com.updateMultipleBookmarks(bkmks, i, time, tries);
						} else {
							//Error...alert user
							com.GMS.errorSendingBookmark(bm);
						}
					}
				}
			}
		} else {
			this.getIDs(i, time, bkmks);
		}
	},
	getSignOffRequest : function () {
		var req = Components.classes["@mozilla.org/xmlextras/xmlhttprequest;1"]
			.createInstance(Components.interfaces.nsIXMLHttpRequest);
		req.open("GET", "https://www.google.com/accounts/Logout2", true);
		return req;
	},
	//Used with filters, exporting, and other things
	getSendRequest : function (bm) {
		var req = Components.classes["@mozilla.org/xmlextras/xmlhttprequest;1"]
			.createInstance(Components.interfaces.nsIXMLHttpRequest);
		req.open("POST", 'https://www.google.com/bookmarks/mark', true);
		req.setRequestHeader("Content-Type",
			"application/x-www-form-urlencoded");
		var http = Components.classes["@mozilla.org/network/protocol;1?name=http"].getService(Components.interfaces.nsIHttpProtocolHandler);
		var useragent = http.userAgent;
		//req.setRequestHeader('User-Agent', useragent+" GoogleToolbarFF");
		req.setRequestHeader('User-Agent', useragent + " GMarks");
		req.setRequestHeader('Accept', 'text/xml,application/xml,application/xhtml+xml,text/html;q=0.9,text/plain;q=0.8,image/png,*/*;q=0.5');
		return req;
	},
	getSendData : function (bm) {
		/*
		 * Google removes javascript bookmarklets from the rss feed,
		 * so we need to move the javascript to the notes field
		 */
		if (bm.url.indexOf("javascript:") == 0) {
			bm.notes = bm.url;
			bm.url = this.BKMKLET_URL + "&str=";
			/* add a random string to make a unique url */
			var chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz".split("");
			var string_length = 40;
			for (var i = 0; i < string_length; i++) {
				var idx = Math.floor(Math.random() * chars.length);
				bm.url += chars[idx]; //chars.substring(rnum,rnum+1);
			}
		}
		var data = 's=' + this.signature + '&bkmk=' + encodeURIComponent(bm.url) + '&title=' + encodeURIComponent(bm.title) +
			'&labels=' + encodeURIComponent(bm.labels) + '&annotation=' + encodeURIComponent(bm.notes) + "&zx=" + Math.floor(Math.random() * 32768);
		return data;
	},
	getRemoveRequest : function () {
		return this.getSendRequest();
	},
	getRemoveData : function (bm) {
		return 'dlq=' + bm.id + '&s=' + this.signature;
	},
	//sends the data to Google
	send : function (data, async, bm, tries) {
		async = async != null ? async : true;
		var req = this.getSendRequest();
		if (data && data.length > 0) {
			/* Add Signature */
			data += '&s=' + this.signature;
		}
		req.send(data);
		var com = this;
		req.onreadystatechange = function () {
			if (req.readyState == 4) {
				var status = -1;
				try {
					status = req.status;
				} catch (e) {
					debug("error getting status after sending\n", true);
				}
				if (status == 200) {
					if (bm) {
						if (bm.id == 0) {
							com.getIDs(1, bm.date);
							//com.getID(bm); //so it can be deleted later...
						}
					}
				} else {
					if (!tries)
						tries = 1;
					else
						tries++;
					if (tries < 5) {
						com.send(data, async, bm, tries);
					} else {
						//Error...alert user
						com.GMS.errorSendingBookmark(bm);
					}
				}
			}
		}
	},
	checkSignedCookie : function () {
		var cookieManager = Components.classes["@mozilla.org/cookiemanager;1"]
			.getService(Components.interfaces.nsICookieManager);
		var i = cookieManager.enumerator;
		var signedIn = false;
		while (i.hasMoreElements()) {
			var cookie = i.getNext();
			if (cookie instanceof Components.interfaces.nsICookie) {
				if (cookie.host == ".google.com")
					if (cookie.name == "SID" || cookie.name == "LSID") {
						return true;
					}
			}
		}
		return false;
	},
	asyncOnChannelRedirect : function (oldChan, newChan, flags, redirectCallback) {
		this.onChannelRedirect(oldChan, newChan, flags);
		redirectCallback.onRedirectVerifyCallback(0);
	},
	// nsIChannelEventSink
	onChannelRedirect : function (aOldChannel, aNewChannel, aFlags) {
		if (this.channel == aOldChannel)
			this.channel = aNewChannel;
	},
	// nsIInterfaceRequestor
	getInterface : function (aIID) {
		try {
			return this.QueryInterface(aIID);
		} catch (e) {
			throw Components.results.NS_NOINTERFACE;
		}
	},
	onStartRequest : function (aRequest, aContext) {
		this.data = "";
	},
	onDataAvailable : function (aRequest, aContext, aStream, aSourceOffset, aLength) {
		var is = Components.classes["@mozilla.org/scriptableinputstream;1"]
			.createInstance(Ci.nsIScriptableInputStream);
		is.init(aStream);
		this.data += is.read(aLength);
	},
	onStopRequest : function (aRequest, aContext, aStatus) {
		if (aStatus == Components.results.NS_BINDING_ABORTED)
			return;
		var com = this,
			data = this._data;
		
		var httpChannel = aRequest.QueryInterface(Ci.nsIHttpChannel);
		com.GMS.isSignedIn = com.checkSignedCookie();
		if (com.GMS.isSignedIn && data.refresh) {
			com.GMS.doCommand("retryreload");
		} else if (com.GMS.isSignedIn) {
			com.GMS.doCommand("bookmarks-load-start");
			com.GMS.getBookmarksFeed(data.action, data.sidebar, data.start, data.num);
		} else {
			var cookies = httpChannel.getResponseHeader("Set-Cookie").split(/;|(\n)/),
				token;
			for (var i = 0; i < cookies.length; i++) {
				if (cookies[i] && cookies[i].match(/^(GALX)=/)) {
					token = "&" + cookies[i];
				}
			}
			if (token && token != "")
				com.onSignIn(data.refresh, data.email, data.pass, data.action, data.sidebar, data.start, data.num, token);
			else {
				com.GMS.recievedBookmarks = 0;
				com.GMS.doCommand('onrefresh');
				com.GMS.alertUser("If the bookmark is not loaded yet, please restart browser and relogin again!");
			}
		}
	},
	stop : function () {
		if (this.channel) {
			this.channel.cancel(Components.results.NS_BINDING_ABORTED);
		}
	},
	onSignIn : function (refresh, email, pass, action, sidebar, start, num, token) {
		var data = "ltmpl=wsad&ltmplcache=2&rm=false&Email=" + email + "&Passwd=" + pass;
		if (token && token != "")
			data += token;
		this._data = {
			'refresh': refresh,
			'email': email,
			'pass': pass,
			'action': action,
			'sidebar': sidebar,
			'start': start,
			'num': num,
			'token': token
		};
		var ioService = Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService);
		var uri = ioService.newURI('https://www.google.com/accounts/ServiceLoginAuth', null, null);
		var channel = ioService.newChannelFromURI(uri);
		var httpChannel = channel.QueryInterface(Components.interfaces.nsIHttpChannel);
		if (data || data == "") {
			var uploadStream = Components.classes["@mozilla.org/io/string-input-stream;1"]
				.createInstance(Components.interfaces.nsIStringInputStream);
			uploadStream.setData(data, data.length);
			var uploadChannel = channel.QueryInterface(Components.interfaces.nsIUploadChannel);
			uploadChannel.setUploadStream(uploadStream, "application/x-www-form-urlencoded", -1);
			httpChannel.requestMethod = "POST";
		}
		this.channel = channel;
		channel.notificationCallbacks = this;
		channel.asyncOpen(this, httpChannel);
	},
	signOut : function () {},
	/*
	 * Converts the date from a string into a date object
	 */
	convertDate : function (strDate) {
		strDate = strDate.substring(5);
		var sections = strDate.split(" ");
		var day = sections[0];
		var monthStr = sections[1];
		var months = new Array("Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec");
		var month = months.indexOf(monthStr);
		var year = sections[2];
		var arrTime = null;
		if (sections.length >= 3)
			arrTime = sections[3].split(":");
		
		var date = new Date();
		date.setFullYear(year, month, day);
		if (arrTime)
			date.setHours(parseInt(arrTime[0]), parseInt(arrTime[1])), parseInt(arrTime[2]);
		return date;
	},
	/*
	 * Downloads the bookmark xml feed from Google and calls the command passed in (action)
	 * There are so many try and catches because I got fed up with people complaining of all these obscure errors.
	 */
	getBookmarksFeed : function (action, sidebar, start, num) {
		this.recievedBookmarks = 1;
		var prefs = Components.classes["@mozilla.org/preferences-service;1"].
			getService(Components.interfaces.nsIPrefService).
			getBranch("gmarks");
		var validate = this.GMS.validateFavs;
		var invalidlbls = prefs.getCharPref(".invalidlbls");
		var invalid = invalidlbls.split(/,\s*/);
		start = start ? start : 0;
		num = num ? num : 1000;
		var dom; //Bookmark info
		this.GMS.isSignedIn = this.GMS.checkSignedCookie();
		debug("GMarks isSignedIn=" + this.GMS.isSignedIn + "\n");
		var auto = prefs.getBoolPref(".signin");
		if (auto && !this.GMS.isSignedIn) {
			var pass = this.GMS.getPassInfo();
			if (pass) {
				this.onSignIn(false, pass.user, pass.password, action, sidebar, start, num);
			}
		} else if (!this.GMS.isSignedIn) {
			this.GMS.recievedBookmarks = 0;
			this.GMS.doCommand('onrefresh');
			return;
		}
		if (!action)
			action = "onrefresh";
		var com = this;
		
		if (com.GMS.isSignedIn) {
			com.GMS.sortBy = prefs.getCharPref("sortby");
			com.GMS.loading = true;
			var loadFreq = (com.GMS.sortBy == "freq" || com.GMS.showFreq == true);
			var req = Components.classes["@mozilla.org/xmlextras/xmlhttprequest;1"]
				.createInstance(Components.interfaces.nsIXMLHttpRequest);
			req.open("GET", "https://www.google.com/bookmarks/lookup?output=rss&sort=" +
				com.GMS.sortBy + "&start=" + start + "&num=" + num, true);
			req.send(null);
			debug("GMarks RSS: Connecting... \n");
			req.onreadystatechange = function (ev) {
				if (req.readyState == 4) {
					var status = -1;
					try {
						status = req.status
					} catch (e) {};
					if (status == 200) {
						if ((dom = req.responseXML)) {
							//<smh:signature>siggoeshere</smh:signature>
							var sigs = dom.documentElement.getElementsByTagName("signature");
							if (sigs.length == 0)
								sigs = dom.documentElement.getElementsByTagName("smh:signature");
							if (sigs.length == 0)
								sigs = dom.documentElement.getElementsByTagNameNS("smh", "signature");
							if (sigs.length > 0)
								com.signature = sigs[0].firstChild.nodeValue;
							var items = dom.documentElement.getElementsByTagName('item');
							if (start == 0)
								com.GMS.bookmarkArray = new Array();
							var i = 0;
							var badApples = 0;
							var startindex = com.GMS.bookmarkArray.length;
							var recentDate = 0;
							var freqMin = 0;
							if (start == 0) {
								com.GMS.recent = new Array();
								com.GMS.frequent = new Array();
							} else {
								if (com.GMS.recent.length > 0)
									recentDate = com.GMS.recent[com.GMS.recent.length - 1];
								if (com.GMS.frequent.length > 0)
									frequentDate = com.GMS.frequent[com.GMS.frequent.length - 1];
							}
							//For getting the visit count info
							var RDF,
							HISTDS = null;
							if (!Components.classes["@mozilla.org/browser/nav-history-service;1"]) {
								RDF = Components.classes["@mozilla.org/rdf/rdf-service;1"]
									.getService(Components.interfaces.nsIRDFService);
								try {
									HISTDS = RDF.GetDataSource("rdf:history");
								} catch (e) {
									loadFreq = false;
								}
							}
							
							for (i = 0; i < items.length; i = i + 1) {
								var newbkmk;
								try {
									newbkmk = com.getBookmarkFromRSS(items[i], loadFreq, RDF, HISTDS);
									var tIndex = i + startindex - badApples;
									if (i > 0 && com.GMS.sortBy != "date") {
										tIndex = com.GMS.addBookmark(newbkmk);
									} else {
										com.GMS.bookmarkArray[tIndex] = newbkmk;
										com.GMS.updateRecent(newbkmk);
									}
									if (com.GMS.showFavs && (com.GMS.sortBy == "date" || !com.GMS.validateFavs)) {
										com.GMS.getImage(tIndex, 0);
									}
								} catch (e) {
									badApples++;
									debug("Error with bookmark\n", true);
									debug(e + "\n", true);
									debug("stack: " + e.stack + "\n", true);
									debug("Title: " + newbkmk.title + "\n", true);
									debug("URL: " + newbkmk.url + "\n", true);
									debug("Labels: " + newbkmk.labels + "\n", true);
									debug("ID: " + newbkmk.id + "\n", true);
									debug("Date: " + newbkmk.date + "\n", true);
								}
							}
						}
						if (badApples > 0)
							debug("GMarks: number of bad bookmarks = " + badApples + "\n");
						if (items.length == num) {
							com.getBookmarksFeed(action, sidebar, start + 1000, num);
						} else {
							if (com.GMS.sortBy != "date") {
								if (com.GMS.showFavs && com.GMS.validateFavs) {
									//This is done after already looping because doing it in the first loop
									//would result in a different index. It would then need to search
									//the array each time it gets a favicon response
									for (var i = 0; i < com.GMS.bookmarkArray.length; i++)
										com.GMS.getImage(i, 0);
								}
							}
							if (com.GMS.readerLabel.length == 0) {
								com.GMS.recievedBookmarks = 2;
								com.GMS.loading = false;
								com.GMS.doCommand(action);
							} else {
								com.GMS.getReaderStars(action);
							}
						}
						
					} else {
						//Problem loading!
						com.GMS.loading = false;
						com.GMS.isSignedIn = false;
						com.GMS.recievedBookmarks = 0;
						com.GMS.doCommand("onload");
						dump("Bookmark connection error\n");
					}
				}
			}
		} //else if (sidebar) this.doCommand(action);
	},
	/*
	 * Same as the getBookmarksFeed, but returns only those which fit the query
	 */
	getSiteSearch : function (query, action, sidebar) {
		var com = this;
		var prefs = Components.classes["@mozilla.org/preferences-service;1"].
			getService(Components.interfaces.nsIPrefService).getBranch("gmarks");
		var validate = com.GMS.validateFavs;
		var invalidlbls = prefs.getCharPref(".invalidlbls");
		var invalid = invalidlbls.split(/,\s*/);
		var dom; //Bookmark info
		this.GMS.isSignedIn = this.checkSignedCookie();
		var auto = prefs.getBoolPref(".signin");
		if (auto && !this.GMS.isSignedIn) {
			var pass = this.GMS.getPassInfo();
			if (pass)
				this.onSignIn(false, pass.user, pass.password);
		}
		
		if (com.GMS.isSignedIn) {
			com.GMS.sortBy = prefs.getCharPref("sortby");
			com.GMS.loading = true;
			var req = Components.classes["@mozilla.org/xmlextras/xmlhttprequest;1"]
				.createInstance(Components.interfaces.nsIXMLHttpRequest);
			
			// Asyncronous connection with Google Bookmarks server
			req.open("GET", "https://www.google.com/bookmarks/find?start=0&bkmk=1&output=rss&num=10000&q=" + query, true);
			req.send(null);
			debug("Search RSS: Connecting... \n");
			req.onreadystatechange = function (ev) {
				if (req.readyState == 4) {
					var status = -1;
					try {
						status = req.status
					} catch (e) {
						dump("error getting the status\n");
					}
					
					if (status == 200) {
						debug("Search RSS: Connection worked! (" + req.status + ")\n")
						if ((dom = req.responseXML)) {
							var items = dom.documentElement.getElementsByTagName('item');
							com.GMS.searchArray = new Array(items.length);
							var i = 0;
							for (i = 0; i < items.length; i = i + 1) {
								var newbkmk = com.getBookmarkFromRSS(items[i], false);
								com.GMS.searchArray[i] = newbkmk;
								if (com.GMS.showFavs) {
									com.GMS.getImage(i, 1);
								}
							}
							debug("RSS Items: " + com.GMS.searchArray.length + "\n");
							com.GMS.loading = false;
							com.GMS.doCommand(action);
						}
					}
				}
			}
		} else if (sidebar) {
			com.GMS.loading = false;
			com.GMS.doCommand(action);
		}
	},
	getBookmarkFromRSS : function (xml, loadFreq, RDF, HISTDS) {
		var auxBookmark = this.GMS.createNewBookmark();
		auxBookmark.labels = new Array();
		
		var eleArr;
		try {
			//For FF2
			eleArr = xml.getElementsByTagName('bkmk_id');
			//For FF3
			if (eleArr == null || eleArr.length == 0)
				eleArr = xml.getElementsByTagName("smh:bkmk_id");
			if (eleArr == null || eleArr.length == 0)
				eleArr = xml.getElementsByTagNameNS("smh", "bkmk_id");
			if (eleArr != null)
				auxBookmark.id = eleArr[0].childNodes[0].nodeValue;
			else
				auxBookmark.id = 0;
		} catch (e) {
			auxBookmark.id = 0;
			debug("GMarks - id error\n" + e + "\n", true);
		}
		try {
			var links = xml.getElementsByTagName('link');
			if (links.length > 0 && links[0].childNodes.length > 0) {
				auxBookmark.url = links[0].childNodes[0].nodeValue;
			} else
				auxBookmark.url = "about:blank";
		} catch (e) {
			auxBookmark.url = "about:blank";
			debug("GMarks - url error\n" + e + "\n", true);
		}
		try {
			//For FF2
			eleArr = xml.getElementsByTagName('bkmk_title');
			//For FF3
			if (eleArr == null || eleArr.length == 0)
				eleArr = xml.getElementsByTagName("smh:bkmk_title");
			if (eleArr == null || eleArr.length == 0)
				eleArr = xml.getElementsByTagNameNS("smh", "bkmk_title");
			var tag = eleArr;
			if (tag != null && tag.length > 0)
				auxBookmark.title = tag[0].childNodes[0].nodeValue;
			else
				auxBookmark.title = auxBookmark.url;
		} catch (e) {
			auxBookmark.title = auxBookmark.url;
			debug("GMarks - title error\n" + e + "\n", true);
		}
		/*
		var RDF = Components.classes["@mozilla.org/rdf/rdf-service;1"] .getService(Components.interfaces.nsIRDFService); var HISTDS = RDF.GetDataSource("rdf:history"); var kRDFLITIID = Components.interfaces.nsIRDFLiteral; var kRDFINTIID = Components.interfaces.nsIRDFInt; var NC_NS = "http://home.netscape.this/NC-rdf#"; var aURL="http://google.com"; var rSource = RDF.GetResource(aURL); var nameArc = RDF.GetResource(NC_NS+"Name"); var urlArc = RDF.GetResource(NC_NS+"URL"); var visitArc = RDF.GetResource(NC_NS+"VisitCount"); var rName = HISTDS.GetTarget(rSource, visitArc, true); var visits = rName ? rName.QueryInterface(kRDFINTIID).Value : -1; print("visits: "+visits);
		 */
		if (loadFreq) {
			try {
				auxBookmark.freq = this.GMS.getBookmarkVisits(auxBookmark.url, RDF, HISTDS);
				
				//See if its one of the 10 most frequent bookmarks.
				if (this.GMS.frequent.length < 10 || auxBookmark.freq > freqMin) {
					var addedbkmk = this.GMS.updateFrequent(auxBookmark);
					if (addedbkmk) {
						freqMin = this.GMS.frequent[this.GMS.frequent.length - 1].freq;
					}
				}
			} catch (e) {
				dump("History access error\n" + e + "\n", true);
			}
		}
		try {
			auxBookmark.date = this.convertDate(xml.getElementsByTagName('pubDate')[0].childNodes[0].nodeValue);
			//this.GMS.updateRecent(auxBookmark);
		} catch (e) {
			auxBookmark.date = new Date();
			debug("GMarks - date error\n" + e + "\n", true);
		}
		try {
			//For FF2
			eleArr = xml.getElementsByTagName('bkmk_annotation');
			//For FF3
			if (eleArr == null || eleArr.length == 0)
				eleArr = xml.getElementsByTagName("smh:bkmk_annotation");
			if (eleArr == null || eleArr.length == 0)
				eleArr = xml.getElementsByTagNameNS("smh", "bkmk_annotation");
			var notesNode = eleArr;
			if (notesNode != null && notesNode.length > 0) {
				auxBookmark.notes = notesNode[0].childNodes[0].nodeValue;
				auxBookmark.notes = decodeURIComponent(auxBookmark.notes);
			} else
				auxBookmark.notes = "";
		} catch (e) {
			auxBookmark.notes = "";
			debug("GMarks - notes error\n" + e + "\n", true);
		}
		try {
			//For FF2
			eleArr = xml.getElementsByTagName('bkmk_label');
			//For FF3
			if (eleArr == null || eleArr.length == 0)
				eleArr = xml.getElementsByTagName("smh:bkmk_label");
			if (eleArr == null || eleArr.length == 0)
				eleArr = xml.getElementsByTagNameNS("smh", "bkmk_label");
			var auxLabelsArray = eleArr;
			for (var j = 0; j < auxLabelsArray.length; j++) {
				auxBookmark.labels.push(auxLabelsArray[j].childNodes[0].nodeValue);
			}
		} catch (e) {
			debug("GMarks - label error\n" + e + "\n", true);
		}
		/*
		 * If it should be a bookmark, put the javascript: link in the url field
		 * GMarks puts it in the notes field because Google insists on stripping it out.
		 */
		if (auxBookmark.url.indexOf(this.BKMKLET_URL) > -1 ||
			auxBookmark.url.indexOf(this.OLD_BKMKLET_URL) > -1) {
			auxBookmark.url = auxBookmark.notes;
			auxBookmark.notes = "";
		}
		
		return auxBookmark;
	},
	/*
	 * Retrieves the starred items from Google Reader
	 * This is not called by default, there is an option to turn this on.
	 */
	getReaderStars : function (action) {
		var req = Components.classes["@mozilla.org/xmlextras/xmlhttprequest;1"]
			.createInstance(Components.interfaces.nsIXMLHttpRequest);
		var userId = "-";
		var num = 1000;
		var validate = this.GMS.validateFavs;
		this.GMS.loading = true;
		req.open("GET", "https://www.google.com/reader/atom/user/" + userId + "/state/com.google/starred?n=" + num + "&ck=" + userId, true);
		req.send(null);
		debug("GReader XML: Connecting... \n");
		var com = this;
		req.onreadystatechange = function (ev) {
			if (req.readyState == 4) {
				var status = -1;
				try {
					status = req.status
				} catch (e) {}
				if (status == 200) {
					if ((dom = req.responseXML)) {
						var items = dom.documentElement.getElementsByTagName('entry');
						var i = 0;
						for (i = 0; i < items.length; i++) {
							var auxBookmark;
							try {
								auxBookmark = com.GMS.createNewBookmark();
								auxBookmark.id = 1;
								auxBookmark.serv = "GReader";
								try {
									var categories = items[i].getElementsByTagName('category');
									for (var j = 0; j < categories.length; j++) {
										var term = categories[j].getAttribute('term');
										var pos
										var prefix = 'user/' + userId + '/label/';
										if ((pos = term.indexOf(prefix)) != -1) {
											auxBookmark.labels.push(term.substring(pos + prefix.length));
										}
									}
								} catch (e) {
									debug("error getting categories\n");
								}
								auxBookmark.labels.push(com.GMS.readerLabel);
								try {
									auxBookmark.url = items[i].getElementsByTagName('id')[0].getAttribute('gr:original-id');
								} catch (e) {
									auxBookmark.url = "about:blank";
									debug("GReader - url error\n");
								}
								try {
									var tag = items[i].getElementsByTagName('title');
									if (tag.length > 0) {
										auxBookmark.title = tag[0].childNodes[0].nodeValue;
										auxBookmark.title = auxBookmark.title.replace('&quot;', '"');
									} else
										auxBookmark.title = auxBookmark.url;
								} catch (e) {
									auxBookmark.title = auxBookmark.url;
									debug("GReader - title error\n");
								}
								try {
									auxBookmark.date = new Date(items[i].getAttribute('gr:crawl-timestamp-msec'));
								} catch (e) {
									auxBookmark.date = 0;
									debug("GReader - date error\n");
								}
								var idx = com.GMS.updateBookmark(auxBookmark, false, null, true);
								if (com.GMS.showFavs) {
									com.GMS.getImage(idx, 0);
								}
							} catch (e) {
								debug('error loading reader item\n');
							}
						}
					}
					com.GMS.recievedBookmarks = 2;
				} else {
					com.GMS.recievedBookmarks = 0;
				}
				
				com.GMS.loading = false;
				if (action.length > 0) {
					com.GMS.doCommand(action);
				}
			}
		}
	},
	/*
	 * Gets the id of the last added bookmark so it can be removed during the current session.
	 */
	getIDs : function (i, time, bkmks) {
		
		var dom; //Bookmark info
		this.GMS.isSignedIn = this.checkSignedCookie();
		var com = this;
		if (this.GMS.isSignedIn) {
			var req = Components.classes["@mozilla.org/xmlextras/xmlhttprequest;1"]
				.createInstance(Components.interfaces.nsIXMLHttpRequest);
			
			//&all=1
			//Math.floor(time*999.996780335)
			//dump("time: "+new Date(time)+"\n");
			req.open("GET", "https://www.google.com/bookmarks/lookup?output=xml&num=30&min=" + Math.floor(time * 999.996780335), true);
			// req.open("GET", "http://www.google.com/bookmarks/lookup?output=xml&num=2000&min="+Math.floor(time*999), true);
			//req.open("GET", "http://www.google.com/bookmarks/lookup?output=xml&sort=date&num="+i, true);
			req.send(null);
			req.onreadystatechange = function (ev) {
				if (req.readyState == 4) {
					var status = -1;
					try {
						status = req.status
					} catch (e) {
						dump("error getting the status2\n");
					}
					if (status == 200) {
						if ((dom = req.responseXML)) {
							var items = dom.documentElement.getElementsByTagName('bookmark');
							//dump("bookmarks: "+items.length+" i: "+i+"\n");
							//com.GMS.bookmarkArray=new Array(items.length);
							var i = 0;
							var badApples = 0;
							var RDF,
							HISTDS;
							RDF = Components.classes["@mozilla.org/rdf/rdf-service;1"]
								.getService(Components.interfaces.nsIRDFService);
							try {
								HISTDS = RDF.GetDataSource("rdf:history");
							} catch (e) {}
							for (i = 0; i < items.length; i = i + 1) {
								var tmpBkmk = com.GMS.createNewBookmark();
								var item = items[i];
								try {
									tmpBkmk.id = item.getElementsByTagName('id')[0].childNodes[0].nodeValue;
									tmpBkmk.url = item.getElementsByTagName('url')[0].childNodes[0].nodeValue;
									var titlenode = item.getElementsByTagName('title');
									if (titlenode.length > 0 && titlenode[0].childNodes.length > 0)
										tmpBkmk.title = titlenode[0].childNodes[0].nodeValue;
									var date = item.getElementsByTagName('timestamp')[0].childNodes[0].nodeValue;
									tmpBkmk.freq = com.GMS.getBookmarkVisits(tmpBkmk, RDF, HISTDS);
									tmpBkmk.date = new Date(date / 1000);
									//dump("date: "+date+"\n");
									//dump(tmpBkmk.date+"\n");
									
									//tmpBkmk.setTime(item.getElementsByTagName('timestamp')[0].childNodes[0].nodeValue);
									var idx = com.GMS.getBookmarkIndex(tmpBkmk);
									if (idx < 0)
										idx = com.GMS.isBookmarked(tmpBkmk);
									if (idx >= 0 && idx != false) {
										com.GMS.bookmarkArray[idx].id = tmpBkmk.id;
									} else {
										debug("Could not find bookmark with GETID(" + idx + ")\n", true);
										debug("Title: " + tmpBkmk.title + "\n", true);
										debug("Url: " + tmpBkmk.url + "\n", true);
										debug("ID: " + tmpBkmk.id + "\n", true);
										debug("Date: " + tmpBkmk.date + "\n", true);
									}
									
								} catch (e) {
									debug("Error with bookmark\n", true);
									debug(e + "\n", true);
								}
							}
						}
					} else {
						debug("error getting the new id", true);
					}
				}
			}
		}
	},
	getID : function (bm) {
		var dom; //Bookmark info
		this.GMS.isSignedIn = this.checkSignedCookie();
		var com = this;
		if (this.isSignedIn) {
			var req = Components.classes["@mozilla.org/xmlextras/xmlhttprequest;1"]
				.createInstance(Components.interfaces.nsIXMLHttpRequest);
			
			req.open("GET", "https://www.google.com/bookmarks/lookup?output=xml&sort=date&num=1", true);
			req.send(null);
			req.onreadystatechange = function (ev) {
				if (req.readyState == 4) {
					var status = -1;
					try {
						status = req.status
					} catch (e) {
						dump("error getting the status2\n");
					}
					if (status == 200) {
						if ((dom = req.responseXML)) {
							var item = dom.documentElement.getElementsByTagName('bookmark')[0];
							var tmpBkmk = {
								id : 0,
								url : null,
								title : null,
								labels : new Array(),
								notes : "",
								date : 0,
								image : null
							}; //createNewBookmark();
							tmpBkmk.id = item.getElementsByTagName('id')[0].childNodes[0].nodeValue;
							tmpBkmk.url = item.getElementsByTagName('url')[0].childNodes[0].nodeValue;
							tmpBkmk.date = item.getElementsByTagName('timestamp')[0].childNodes[0].nodeValue;
							tmpBkmk.labels = new Array();
							var tag = item.getElementsByTagName('title');
							if (tag.length > 0)
								tmpBkmk.title = tag[0].childNodes[0].nodeValue;
							else
								tmpBkmk.title = tmpBkmk.url;
							
							var idx = cin.GMS.getBookmarkIndex(tmpBkmk);
							if (idx >= 0) {
								debug("Found ID for " + com.GMS.bookmarkArray[idx].title + " | " + com.GMS.bookmarkArray[idx].url + "\n");
								com.GMS.bookmarkArray[idx].id = tmpBkmk.id; ;
								if (!com.GMS.validateFavs && com.GMS.showFavs) {
									try {
										this.bookmarkArray[idx].image = this.getIcon(this.bookmarkArray[idx].url).spec;
									} catch (e) {}
								}
								com.GMS.doCommand("quickrefresh");
							} else {
								debug("Could not find bookmark with GETID\n", true);
							}
						}
					} else
						debug("error getting the new id", true);
				}
			}
		}
	},
	//Required
	QueryInterface : function (iid) {
		if (!iid.equals(Components.interfaces.nsISupports) &&
			!iid.equals(GMARKS_COM_IID))
			throw Components.results.NS_ERROR_NO_INTERFACE;
		return this;
	}
}
function debug(msg, force) {
	if (force) {
		dump(msg);
	} else {
		//dump(msg);
	}
}
var nsGMarksComModule = {
	registerSelf : function (compMgr, fileSpec, location, type) {
		compMgr =
			compMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
		compMgr.registerFactoryLocation(GMARKS_COM_CID,
			"GMarks Com",
			GMARKS_COM_CONTRACTID,
			fileSpec,
			location,
			type);
	},
	unregisterSelf : function (aCompMgr, aLocation, aType) {
		aCompMgr = aCompMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
		aCompMgr.unregisterFactoryLocation(GMARKS_COM_CID, aLocation);
	},
	getClassObject : function (compMgr, cid, iid) {
		if (!cid.equals(GMARKS_COM_CID))
			throw Components.results.NS_ERROR_NO_INTERFACE;
		if (!iid.equals(Components.interfaces.nsIFactory))
			throw Components.results.NS_ERROR_NOT_IMPLEMENTED;
		return nsGMarksComFactory;
	},
	canUnload : function (compMgr) {
		return true;
	}
};
var nsGMarksComFactory = {
	singleton : null,
	createInstance : function (aOuter, aIID) {
		if (aOuter != null)
			throw Components.results.NS_ERROR_NO_AGGREGATION;
		if (this.singleton == null)
			this.singleton = new nsGMarksCom();
		return this.singleton.QueryInterface(aIID);
	}
};
function NSGetModule(comMgr, fileSpec) {
	return nsGMarksComModule;
}

function NSGetFactory() {
	return nsGMarksComFactory;
}
 