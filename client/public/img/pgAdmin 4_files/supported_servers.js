define(
  'pgadmin.server.supported_servers',
  ['sources/gettext'],
  function(gettext) {
    return [
      
      {label: 'Greenplum Database', value: 'gpdb'},
      {label: 'EDB Advanced Server', value: 'ppas'},
      {label: 'PostgreSQL', value: 'pg'},
      {label: gettext('Unknown'), value: ''}
    ];
  }
);