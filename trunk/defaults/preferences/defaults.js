pref("gmarkssortby","title"); //Either title or date
pref("gmarks.addbookmark.lastSelectedTab",0); //Keeps track of the last opened add bookmark tab, 0 for ff, 1 for GMarks, 2 for both
pref("gmarks.suggest",true); //GMarks suggest - suggests existing labels if they are found in the title
pref("gmarks.showAddBookmark", false); //Toggles an Add Bookmark button on the sidebar
pref("gmarks.ctrlD", true); //Toggle wrapping GMarks around the add bookmark window
pref("gmarks.showIcons",true); //Duh?
pref("gmarks.favicons","gmarks");//"history" gets it from FF3's favicon service, "gmarks" scans each and every bookmarked site for a favicon
pref("gmarks.showFav", true); //Show site favicons or default skin icons
pref("gmarks.icons.validate",false); //Check to see if a favicon exists before using it, checked location is doman/favicon.ico ie: http://example.com/favicon.ico
pref("gmarks.showCount", false); //Shows the number of bookmarks in a label on the sidebar
pref("gmarks.signin", false); //Auto signin
pref("gmarks.invalidlbls","^smh,^tb"); //Just things possibly included in the rss results to exclude
pref("gmarks.nestedChar",">"); //<<<
pref("gmarks.keys.sidebar.modifiers",'alt');//Modifier for the sidebar's shortcut
pref("gmarks.keys.sidebar.key",'m');//shortcut key
pref("gmarks.keys.quicksearch.key",36);//Home by default(36 is the keycode for home)
pref("gmarks.hiddenLabels","");//Labels to be hidden from view
pref("gmarks.unlabeled",""); //Show unlabeled bookmarks with this label
pref("gmarks.readerLabel",""); //Label for Google Reader starred items, blank if disabled
pref("gmarks.openinnewtab",false); //Default to opening bookmarks in a new tab
pref("gmarks.loadLabelAndReplace",false); //When opening a label in new tabs, remove the currently opened tabs first.
pref("gmarks.toolbarFolder",""); //Label to use for the toolbar, "" = all bookmarks
pref("gmarks.toolbarShowIconsOnly",false); //Again, duh?
pref("gmarks.labels",""); //Holds the last opened labels
pref("gmarks.confirmDelete",false);
pref("gmarks.bkmkLabelCombos",false); //enabled bookmark label combos where labels act as bookmarks when clicked, but contain bookmarks themselves
pref("gmarks.showRecent",true);//Show the 10 most recently added/modified items
pref("gmarks.showFreq",true);//Show the 10 most frequently used items
pref("gmarks.menu.hidebookmarks",false);
pref("gmarks.menu.rename",false);
pref("gmarks.menu.hidden",false);
pref("gmarks.menu.items","addeditbookmark,organize,options,separator,mostrecent,mostused,bookmarkstree,separator,refresh");
pref("gmarks.search",0);//0 = get results from online site, 1 = use quick search results(local, faster)
pref("extensions.{A64F9D1E-FA5E-11DA-A187-6B94C2ED2B83}.description", "chrome://gmarks/locale/gmarks.properties"); //localized description
