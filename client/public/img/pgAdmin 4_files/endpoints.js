define(
  'pgadmin.browser.endpoints', [],
  function() {
    return {
            'static': '/static/<path:filename>',

      'about.index': '/about/',

      'browser.index': '/browser/',

      'browser.nodes': '/browser/nodes/',

      'NODE-server.connect_id': '/browser/server/connect/<int:gid>/<int:sid>',

      'NODE-server.connect_id': '/browser/server/connect/<int:gid>/<int:sid>',

      'NODE-server.connect_id': '/browser/server/connect/<int:gid>/<int:sid>',

      'dashboard.index': '/dashboard/',

      'dashboard.get_by_sever_id': '/dashboard/<int:sid>',

      'dashboard.get_by_database_id': '/dashboard/<int:sid>/<int:did>',

      'dashboard.session_stats': '/dashboard/session_stats/',

      'dashboard.get_session_stats_by_sever_id': '/dashboard/session_stats/<int:sid>',

      'dashboard.get_session_stats_by_database_id': '/dashboard/session_stats/<int:sid>/<int:did>',

      'dashboard.tps_stats': '/dashboard/tps_stats/',

      'dashboard.tps_stats_by_server_id': '/dashboard/tps_stats/<int:sid>',

      'dashboard.tps_stats_by_database_id': '/dashboard/tps_stats/<int:sid>/<int:did>',

      'dashboard.ti_stats': '/dashboard/ti_stats/',

      'dashboard.ti_stats_by_server_id': '/dashboard/ti_stats/<int:sid>',

      'dashboard.ti_stats_by_database_id': '/dashboard/ti_stats/<int:sid>/<int:did>',

      'dashboard.to_stats': '/dashboard/to_stats/',

      'dashboard.to_stats_by_server_id': '/dashboard/to_stats/<int:sid>',

      'dashboard.to_stats_by_database_id': '/dashboard/to_stats/<int:sid>/<int:did>',

      'dashboard.bio_stats': '/dashboard/bio_stats/',

      'dashboard.bio_stats_by_server_id': '/dashboard/bio_stats/<int:sid>',

      'dashboard.bio_stats_by_database_id': '/dashboard/bio_stats/<int:sid>/<int:did>',

      'dashboard.activity': '/dashboard/activity/',

      'dashboard.get_activity_by_server_id': '/dashboard/activity/<int:sid>',

      'dashboard.get_activity_by_database_id': '/dashboard/activity/<int:sid>/<int:did>',

      'dashboard.locks': '/dashboard/locks/',

      'dashboard.get_locks_by_server_id': '/dashboard/locks/<int:sid>',

      'dashboard.get_locks_by_database_id': '/dashboard/locks/<int:sid>/<int:did>',

      'dashboard.prepared': '/dashboard/prepared/',

      'dashboard.get_prepared_by_server_id': '/dashboard/prepared/<int:sid>',

      'dashboard.get_prepared_by_database_id': '/dashboard/prepared/<int:sid>/<int:did>',

      'dashboard.config': '/dashboard/config/',

      'dashboard.get_config_by_server_id': '/dashboard/config/<int:sid>',

      'help.static': '/help/help/<path:filename>',

      'misc.ping': '/misc/ping',

      'misc.index': '/misc/',

      'misc.cleanup': '/misc/cleanup',

      'bgprocess.status': '/misc/bgprocess/<pid>',

      'bgprocess.detailed_status': '/misc/bgprocess/<pid>/<int:out>/<int:err>/',

      'bgprocess.acknowledge': '/misc/bgprocess/<pid>',

      'bgprocess.list': '/misc/bgprocess/',

      'file_manager.filemanager': '/file_manager/filemanager/<int:trans_id>/',

      'file_manager.index': '/file_manager/',

      'file_manager.get_trans_id': '/file_manager/get_trans_id',

      'file_manager.delete_trans_id': '/file_manager/del_trans_id/<int:trans_id>',

      'file_manager.save_last_dir': '/file_manager/save_last_dir/<int:trans_id>',

      'file_manager.save_file_dialog_view': '/file_manager/save_file_dialog_view/<int:trans_id>',

      'file_manager.save_show_hidden_file_option': '/file_manager/save_show_hidden_file_option/<int:trans_id>',

      'bgprocess.status': '/misc/bgprocess/<pid>',

      'bgprocess.detailed_status': '/misc/bgprocess/<pid>/<int:out>/<int:err>/',

      'bgprocess.acknowledge': '/misc/bgprocess/<pid>',

      'bgprocess.list': '/misc/bgprocess/',

      'file_manager.filemanager': '/file_manager/filemanager/<int:trans_id>/',

      'file_manager.index': '/file_manager/',

      'file_manager.get_trans_id': '/file_manager/get_trans_id',

      'file_manager.delete_trans_id': '/file_manager/del_trans_id/<int:trans_id>',

      'file_manager.save_last_dir': '/file_manager/save_last_dir/<int:trans_id>',

      'file_manager.save_file_dialog_view': '/file_manager/save_file_dialog_view/<int:trans_id>',

      'file_manager.save_show_hidden_file_option': '/file_manager/save_show_hidden_file_option/<int:trans_id>',

      'preferences.index': '/preferences/',

      'preferences.get_by_name': '/preferences/<module>/<preference>',

      'preferences.get_all': '/preferences/get_all',

      'settings.store': '/settings/store/<setting>/<value>',

      'settings.store_bulk': '/settings/store',

      'settings.reset_layout': '/settings/layout',

      'backup.create_server_job': '/backup/job/<int:sid>',

      'backup.create_object_job': '/backup/job/<int:sid>/object',

      'datagrid.initialize_datagrid': '/datagrid/initialize/datagrid/<int:cmd_type>/<obj_type>/<int:sgid>/<int:sid>/<int:did>/<int:obj_id>',

      'datagrid.initialize_query_tool': '/datagrid/initialize/query_tool/<int:sgid>/<int:sid>',

      'datagrid.initialize_query_tool_with_did': '/datagrid/initialize/query_tool/<int:sgid>/<int:sid>/<int:did>',

      'datagrid.filter_validate': '/datagrid/filter/validate/<int:sid>/<int:did>/<int:obj_id>',

      'datagrid.filter': '/datagrid/filter',

      'datagrid.panel': '/datagrid/panel/<int:trans_id>/<is_query_tool>/<path:editor_title>',

      'datagrid.close': '/datagrid/close/<int:trans_id>',

      'debugger.index': '/debugger/',

      'debugger.init_for_function': '/debugger/init/<node_type>/<int:sid>/<int:did>/<int:scid>/<int:fid>',

      'debugger.init_for_trigger': '/debugger/init/<node_type>/<int:sid>/<int:did>/<int:scid>/<int:fid>/<int:trid>',

      'debugger.direct': '/debugger/direct/<int:trans_id>',

      'debugger.initialize_target_for_function': '/debugger/initialize_target/<debug_type>/<int:sid>/<int:did>/<int:scid>/<int:func_id>',

      'debugger.initialize_target_for_trigger': '/debugger/initialize_target/<debug_type>/<int:sid>/<int:did>/<int:scid>/<int:func_id>/<int:tri_id>',

      'debugger.close': '/debugger/close/<int:trans_id>',

      'debugger.restart': '/debugger/restart/<int:trans_id>',

      'debugger.start_listener': '/debugger/start_listener/<int:trans_id>',

      'debugger.execute_query': '/debugger/execute_query/<int:trans_id>/<query_type>',

      'debugger.messages': '/debugger/messages/<int:trans_id>/',

      'debugger.start_execution': '/debugger/start_execution/<int:trans_id>/<int:port_num>',

      'debugger.set_breakpoint': '/debugger/set_breakpoint/<int:trans_id>/<int:line_no>/<int:set_type>',

      'debugger.clear_all_breakpoint': '/debugger/clear_all_breakpoint/<int:trans_id>',

      'debugger.deposit_value': '/debugger/deposit_value/<int:trans_id>',

      'debugger.select_frame': '/debugger/select_frame/<int:trans_id>/<int:frame_id>',

      'debugger.get_arguments': '/debugger/get_arguments/<int:sid>/<int:did>/<int:scid>/<int:func_id>',

      'debugger.set_arguments': '/debugger/set_arguments/<int:sid>/<int:did>/<int:scid>/<int:func_id>',

      'debugger.poll_end_execution_result': '/debugger/poll_end_execution_result/<int:trans_id>/',

      'debugger.poll_result': '/debugger/poll_result/<int:trans_id>/',

      'grant_wizard.acl': '/grant_wizard/acl/<int:sid>/<int:did>/',

      'grant_wizard.objects': '/grant_wizard/<int:sid>/<int:did>/<int:node_id>/<node_type>/',

      'grant_wizard.apply': '/grant_wizard/<int:sid>/<int:did>/',

      'grant_wizard.modified_sql': '/grant_wizard/sql/<int:sid>/<int:did>/',

      'import_export.create_job': '/import_export/job/<int:sid>',

      'maintenance.create_job': '/maintenance/job/<int:sid>/<int:did>',

      'restore.create_job': '/restore/job/<int:sid>',

      'sqleditor.view_data_start': '/sqleditor/view_data/start/<int:trans_id>',

      'sqleditor.query_tool_start': '/sqleditor/query_tool/start/<int:trans_id>',

      'sqleditor.query_tool_preferences': '/sqleditor/query_tool/preferences/<int:trans_id>',

      'sqleditor.poll': '/sqleditor/poll/<int:trans_id>',

      'sqleditor.fetch': '/sqleditor/fetch/<int:trans_id>',

      'sqleditor.fetch_all': '/sqleditor/fetch/<int:trans_id>/<int:fetch_all>',

      'sqleditor.save': '/sqleditor/save/<int:trans_id>',

      'sqleditor.inclusive_filter': '/sqleditor/filter/inclusive/<int:trans_id>',

      'sqleditor.exclusive_filter': '/sqleditor/filter/exclusive/<int:trans_id>',

      'sqleditor.remove_filter': '/sqleditor/filter/remove/<int:trans_id>',

      'sqleditor.set_limit': '/sqleditor/limit/<int:trans_id>',

      'sqleditor.cancel_transaction': '/sqleditor/cancel/<int:trans_id>',

      'sqleditor.get_object_name': '/sqleditor/object/get/<int:trans_id>',

      'sqleditor.auto_commit': '/sqleditor/auto_commit/<int:trans_id>',

      'sqleditor.auto_rollback': '/sqleditor/auto_rollback/<int:trans_id>',

      'sqleditor.autocomplete': '/sqleditor/autocomplete/<int:trans_id>',

      'sqleditor.load_file': '/sqleditor/load_file/',

      'sqleditor.save_file': '/sqleditor/save_file/',

      'sqleditor.query_tool_download': '/sqleditor/query_tool/download/<int:trans_id>',

      'sqleditor.connection_status': '/sqleditor/status/<int:trans_id>',

      'sqleditor.get_filter_data': '/sqleditor/filter_dialog/<int:trans_id>',

      'sqleditor.set_filter_data': '/sqleditor/filter_dialog/<int:trans_id>',

      'user_management.roles': '/user_management/role/',

      'user_management.role': '/user_management/role/<int:rid>',

      'user_management.update_user': '/user_management/user/<int:uid>',

      'user_management.delete_user': '/user_management/user/<int:uid>',

      'user_management.create_user': '/user_management/user/',

      'user_management.users': '/user_management/user/',

      'user_management.user': '/user_management/user/<int:uid>',

      'security.login': '/login',

      'backup.create_server_job': '/backup/job/<int:sid>',

      'backup.create_object_job': '/backup/job/<int:sid>/object',

      'datagrid.initialize_datagrid': '/datagrid/initialize/datagrid/<int:cmd_type>/<obj_type>/<int:sgid>/<int:sid>/<int:did>/<int:obj_id>',

      'datagrid.initialize_query_tool': '/datagrid/initialize/query_tool/<int:sgid>/<int:sid>',

      'datagrid.initialize_query_tool_with_did': '/datagrid/initialize/query_tool/<int:sgid>/<int:sid>/<int:did>',

      'datagrid.filter_validate': '/datagrid/filter/validate/<int:sid>/<int:did>/<int:obj_id>',

      'datagrid.filter': '/datagrid/filter',

      'datagrid.panel': '/datagrid/panel/<int:trans_id>/<is_query_tool>/<path:editor_title>',

      'datagrid.close': '/datagrid/close/<int:trans_id>',

      'debugger.index': '/debugger/',

      'debugger.init_for_function': '/debugger/init/<node_type>/<int:sid>/<int:did>/<int:scid>/<int:fid>',

      'debugger.init_for_trigger': '/debugger/init/<node_type>/<int:sid>/<int:did>/<int:scid>/<int:fid>/<int:trid>',

      'debugger.direct': '/debugger/direct/<int:trans_id>',

      'debugger.initialize_target_for_function': '/debugger/initialize_target/<debug_type>/<int:sid>/<int:did>/<int:scid>/<int:func_id>',

      'debugger.initialize_target_for_trigger': '/debugger/initialize_target/<debug_type>/<int:sid>/<int:did>/<int:scid>/<int:func_id>/<int:tri_id>',

      'debugger.close': '/debugger/close/<int:trans_id>',

      'debugger.restart': '/debugger/restart/<int:trans_id>',

      'debugger.start_listener': '/debugger/start_listener/<int:trans_id>',

      'debugger.execute_query': '/debugger/execute_query/<int:trans_id>/<query_type>',

      'debugger.messages': '/debugger/messages/<int:trans_id>/',

      'debugger.start_execution': '/debugger/start_execution/<int:trans_id>/<int:port_num>',

      'debugger.set_breakpoint': '/debugger/set_breakpoint/<int:trans_id>/<int:line_no>/<int:set_type>',

      'debugger.clear_all_breakpoint': '/debugger/clear_all_breakpoint/<int:trans_id>',

      'debugger.deposit_value': '/debugger/deposit_value/<int:trans_id>',

      'debugger.select_frame': '/debugger/select_frame/<int:trans_id>/<int:frame_id>',

      'debugger.get_arguments': '/debugger/get_arguments/<int:sid>/<int:did>/<int:scid>/<int:func_id>',

      'debugger.set_arguments': '/debugger/set_arguments/<int:sid>/<int:did>/<int:scid>/<int:func_id>',

      'debugger.poll_end_execution_result': '/debugger/poll_end_execution_result/<int:trans_id>/',

      'debugger.poll_result': '/debugger/poll_result/<int:trans_id>/',

      'grant_wizard.acl': '/grant_wizard/acl/<int:sid>/<int:did>/',

      'grant_wizard.objects': '/grant_wizard/<int:sid>/<int:did>/<int:node_id>/<node_type>/',

      'grant_wizard.apply': '/grant_wizard/<int:sid>/<int:did>/',

      'grant_wizard.modified_sql': '/grant_wizard/sql/<int:sid>/<int:did>/',

      'import_export.create_job': '/import_export/job/<int:sid>',

      'maintenance.create_job': '/maintenance/job/<int:sid>/<int:did>',

      'restore.create_job': '/restore/job/<int:sid>',

      'sqleditor.view_data_start': '/sqleditor/view_data/start/<int:trans_id>',

      'sqleditor.query_tool_start': '/sqleditor/query_tool/start/<int:trans_id>',

      'sqleditor.query_tool_preferences': '/sqleditor/query_tool/preferences/<int:trans_id>',

      'sqleditor.poll': '/sqleditor/poll/<int:trans_id>',

      'sqleditor.fetch': '/sqleditor/fetch/<int:trans_id>',

      'sqleditor.fetch_all': '/sqleditor/fetch/<int:trans_id>/<int:fetch_all>',

      'sqleditor.save': '/sqleditor/save/<int:trans_id>',

      'sqleditor.inclusive_filter': '/sqleditor/filter/inclusive/<int:trans_id>',

      'sqleditor.exclusive_filter': '/sqleditor/filter/exclusive/<int:trans_id>',

      'sqleditor.remove_filter': '/sqleditor/filter/remove/<int:trans_id>',

      'sqleditor.set_limit': '/sqleditor/limit/<int:trans_id>',

      'sqleditor.cancel_transaction': '/sqleditor/cancel/<int:trans_id>',

      'sqleditor.get_object_name': '/sqleditor/object/get/<int:trans_id>',

      'sqleditor.auto_commit': '/sqleditor/auto_commit/<int:trans_id>',

      'sqleditor.auto_rollback': '/sqleditor/auto_rollback/<int:trans_id>',

      'sqleditor.autocomplete': '/sqleditor/autocomplete/<int:trans_id>',

      'sqleditor.load_file': '/sqleditor/load_file/',

      'sqleditor.save_file': '/sqleditor/save_file/',

      'sqleditor.query_tool_download': '/sqleditor/query_tool/download/<int:trans_id>',

      'sqleditor.connection_status': '/sqleditor/status/<int:trans_id>',

      'sqleditor.get_filter_data': '/sqleditor/filter_dialog/<int:trans_id>',

      'sqleditor.set_filter_data': '/sqleditor/filter_dialog/<int:trans_id>',

      'user_management.roles': '/user_management/role/',

      'user_management.role': '/user_management/role/<int:rid>',

      'user_management.update_user': '/user_management/user/<int:uid>',

      'user_management.delete_user': '/user_management/user/<int:uid>',

      'user_management.create_user': '/user_management/user/',

      'user_management.users': '/user_management/user/',

      'user_management.user': '/user_management/user/<int:uid>',

      'security.login': '/login'
    };
  });