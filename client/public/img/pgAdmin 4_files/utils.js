define('pgadmin.browser.utils',
  ['sources/pgadmin'], function(pgAdmin) {

  var pgBrowser = pgAdmin.Browser = pgAdmin.Browser || {};

  /* Add hooked-in panels by extensions */
  pgBrowser['panels_items'] = '[{"canHide": true, "content": "", "data": null, "events": null, "height": 600, "icon": "fa fa-tachometer", "isCloseable": true, "isIframe": false, "isPrivate": false, "limit": 1, "name": "dashboard", "priority": 1, "showTitle": true, "title": "Dashboard", "width": 500}, {"canHide": false, "content": "", "data": null, "events": null, "height": 600, "icon": "fa fa-question", "isCloseable": true, "isIframe": true, "isPrivate": true, "limit": null, "name": "pnl_online_help", "priority": 100, "showTitle": true, "title": "Online Help", "width": 500}, {"canHide": false, "content": "", "data": null, "events": null, "height": 600, "icon": "fa fa-info", "isCloseable": true, "isIframe": true, "isPrivate": true, "limit": null, "name": "pnl_sql_help", "priority": 200, "showTitle": true, "title": "SQL Help", "width": 500}]';


  // Define list of nodes on which Query tool option doesn't appears
  var unsupported_nodes = pgAdmin.unsupported_nodes = [
     'server_group', 'server', 'coll-tablespace', 'tablespace',
     'coll-role', 'role', 'coll-resource_group', 'resource_group',
     'coll-database'
  ];

  pgBrowser.utils = {
    layout: '{"floating":[],"root":{"type":"wcSplitter","horizontal":true,"isDrawer":false,"pane0":{"type":"wcFrame","floating":false,"isFocus":false,"tabOrientation":"top","pos":{"x":0.5,"y":0.5},"size":{"x":300,"y":600},"tab":0,"panels":[{"type":"wcPanel","panelType":"browser","size":{"x":300,"y":600},"customData":{}}]},"pane1":{"type":"wcFrame","floating":false,"isFocus":false,"tabOrientation":"top","pos":{"x":0.5,"y":0.5},"size":{"x":500,"y":600},"tab":6,"panels":[{"type":"wcPanel","panelType":"dashboard","size":{"x":500,"y":600},"customData":{}},{"type":"wcPanel","panelType":"properties","size":{"x":500,"y":600},"customData":{}},{"type":"wcPanel","panelType":"sql","size":{"x":500,"y":600},"customData":{}},{"type":"wcPanel","panelType":"statistics","size":{"x":500,"y":600},"customData":{}},{"type":"wcPanel","panelType":"dependencies","size":{"x":500,"y":600},"customData":{}},{"type":"wcPanel","panelType":"dependents","size":{"x":500,"y":600},"customData":{}},{"type":"wcPanel","panelType":"frm_datagrid","size":{"x":300,"y":600},"customData":{}}]},"pos":0.21555555481327446}}',
    pg_help_path: 'https://www.postgresql.org/docs/$VERSION$/static/',
    edbas_help_path: 'https://www.enterprisedb.com/docs/en/$VERSION$/pg/',
    tabSize: '4',
    wrapCode: 'False' == 'True',
    useSpaces: 'False',
    insertPairBrackets: 'True' == 'True',
    braceMatching: 'True' == 'True',
    is_indent_with_tabs: 'True' == 'True',
    app_name: 'pgAdmin 4',
    pg_libpq_version: 100005,
    support_ssh_tunnel: 'True' == 'True',

    counter: {total: 0, loaded: 0},
    registerScripts: function (ctx) {
      // There are some scripts which needed to be loaded immediately,
      // but - not all. We will will need to generate all the menus only
      // after they all were loaded completely.
    },

    addMenus: function (obj) {
      // Generate the menu items only when all the initial scripts
      // were loaded completely.
      //
      // First - register the menus from the other
      // modules/extensions.
      var self = this;
      if (this.counter.total == this.counter.loaded) {
                obj.add_menus([{
          name: "mnu_preferences",
          module: pgAdmin.Preferences,
          callback: "show",
          icon: 'fa fa-cog',
          label: 'Preferences', applies: ['file'],
          priority: 999,
          enable: ''
        }, {
          name: "mnu_resetlayout",
          module: pgAdmin.Settings,
          callback: "show",
          icon: 'fa fa-retweet',
          label: 'Reset Layout', applies: ['file'],
          priority: 999,
          enable: ''
        }]);
                obj.add_menus([]);
                obj.add_menus([]);
                obj.add_menus([]);
                obj.add_menus([{
          name: "mnu_online_help",
          url: "/help/help/index.html?ver=30400",
          target: "_blank",
          icon: 'fa fa-question',
          label: 'Online Help', applies: ['help'],
          priority: 100,
          enable: ''
        }, {
          name: "mnu_pgadmin_website",
          url: "https://www.pgadmin.org/",
          target: "_blank",
          icon: 'fa fa-external-link',
          label: 'pgAdmin Website', applies: ['help'],
          priority: 200,
          enable: ''
        }, {
          name: "mnu_postgresql_website",
          url: "https://www.postgresql.org/",
          target: "_blank",
          icon: 'fa fa-external-link',
          label: 'PostgreSQL Website', applies: ['help'],
          priority: 300,
          enable: ''
        }, {
          name: "mnu_about",
          module: pgAdmin.About,
          callback: "about_show",
          icon: 'fa fa-info-circle',
          label: 'About pgAdmin 4', applies: ['help'],
          priority: 999,
          enable: ''
        }]);
                obj.create_menus();
      } else {
         //recall after some time
         setTimeout(function(){ self.addMenus(obj); }, 3000);
      }
    },

    // load the module right now
    load_module: function(name, path, c) {
      var obj = this;
      require([name],function(m) {
        try {
          // initialize the module (if 'init' function present).
          if (m.init && typeof(m.init) == 'function')
            m.init();
        } catch (e) {
          // Log this exception on console to understand the issue properly.
          console.log(e);
          obj.report_error(gettext('Error loading script - ') + path);
        }
        if (c)
        c.loaded += 1;
      }, function() {
        // Log the arguments on console to understand the issue properly.
        console.log(arguments);
        obj.report_error(gettext('Error loading script - ') + path);
      });
    }
  };
  return pgBrowser;
});