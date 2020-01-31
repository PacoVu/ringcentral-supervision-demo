export function init() {

  alert("test")
  var height = document.getElementById('menu_header').height() + document.getElementById('footer').height()
  var h = window.height() - (height + 25);
  document.getElementById('root').height(h)

  window.onresize = function() {
    var height = document.getElementById('menu_header').height() + document.getElementById('footer').height()
    var h = window.height() - (height + 25);
    document.getElementById('root').height(h)
  }
  document.getElementById('test').innerHtml = "demo"

}
