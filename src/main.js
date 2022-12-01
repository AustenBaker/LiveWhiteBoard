'use strict';

(function() {

  var socket = io();
  var canvas = document.getElementsByClassName('whiteboard')[0];
  var brushColor = document.getElementById('brush-color');
  var saveButton = document.getElementById('save-button');
  var undoButton = document.getElementById('undo-button');
  var clearButton = document.getElementById('clear-button');
  var brushSize = document.getElementById('brush-width');
  var context = canvas.getContext('2d');
  var windowWidth = window.innerWidth * 0.1;
  var windowHeight = window.innerHeight * 0.05;

  var lastX, lastY;
  var mouseX, mouseY;
  var color = '#0000ff';
  var drawing = false;
  var points = []; // point props x, y, size, color, mode: "begin" || "end"

  // Mouse support for desktop pcs
  canvas.addEventListener('mousedown', onMouseDown, false);
  canvas.addEventListener('mouseup', onMouseUp, false);
  canvas.addEventListener('mouseout', onMouseUp, false);
  canvas.addEventListener('mousemove', throttle(onMouseMove, 10), false);
  
  // Touch support for mobile devices
  canvas.addEventListener('touchstart', onMouseDown, false);
  canvas.addEventListener('touchend', onMouseUp, false);
  canvas.addEventListener('touchcancel', onMouseUp, false);
  canvas.addEventListener('touchmove', throttle(onMouseMove, 10), false);

  // resize window 
  window.addEventListener('resize', onResize, false);
  onResize();

  // update color on change
  brushColor.addEventListener('change', () => color = brushColor.value);

  // client listen for server emit drawing event
  socket.on('drawing', onDrawingEvent);


  // locally draws line, emits to server, draws clients
  // when someone draws this gets called
  function drawLine(x0, y0 , x1, y1, color, width, emit){
    y0 = y0;
    y1 = y1;

    context.beginPath();
    context.moveTo(x0, y0);
    context.lineTo(x1, y1);
    context.strokeStyle = color;
    context.lineWidth = width;
    context.lineCap = "round";
    context.stroke();
    context.closePath();

    if (!emit) { return; }
    var w = canvas.width;
    var h = canvas.height;

    //  emits lines to server, each line by throttle
    socket.emit('drawing', {
      x0: x0 / w,
      y0: y0 / h,
      x1: x1 / w,
      y1: y1 / h,
      color: color,
      width: width
    });
  }

  function onMouseDown(e){
    drawing = true;

    mouseX = e.clientX - windowWidth || e.touches[0].clientX - windowWidth;
    mouseY = e.clientY - windowHeight|| e.touches[0].clientY- windowHeight;

    drawLine(mouseX, mouseY, e.clientX - windowWidth||e.touches[0].clientX - windowWidth, e.clientY- windowHeight||e.touches[0].clientY- windowHeight, color, brushSize.value, true);
    points.push({
      x:mouseX, y:mouseY, size:brushSize.value, color:color, mode:"begin" 
    });
  }

  function onMouseMove(e){
    if (!drawing) { return; }
    drawLine(mouseX, mouseY, e.clientX - windowWidth||e.touches[0].clientX - windowWidth, e.clientY- windowHeight||e.touches[0].clientY- windowHeight, color, brushSize.value, true);

    mouseX = e.clientX - windowWidth || e.touches[0].clientX - windowWidth;
    mouseY = e.clientY - windowHeight|| e.touches[0].clientY- windowHeight;

    points.push({
      x: mouseX, y: mouseY, size: brushSize.value, color: color, mode: "draw"
    });
  }

  function onMouseUp(e){
    if (!drawing) { return; }
    mouseX = e.clientX - windowWidth || e.touches[0].clientX - windowWidth;
    mouseY = e.clientY - windowHeight|| e.touches[0].clientY- windowHeight;
    drawLine(mouseX, mouseY, e.clientX - windowWidth||e.touches[0].clientX - windowWidth, e.clientY- windowHeight||e.touches[0].clientY- windowHeight, color, brushSize.value, true);
    points.push({ 
      x:mouseX, y:mouseY, size:brushSize.value, color:color, mode:"end" 
    });
    drawing = false;
  }

  
  // limit the number of events per second
  function throttle(callback, delay) {
    var previousCall = new Date().getTime();
    return function() {
      var time = new Date().getTime();

      if ((time - previousCall) >= delay) {
        previousCall = time;
        callback.apply(null, arguments);
      }
    };
  }

  // client repsonse to recieving server drawer emit data
  function onDrawingEvent(data){
    var w = canvas.width;
    var h = canvas.height;
    drawLine(data.x0 * w, data.y0 * h, data.x1 * w, data.y1 * h, data.color, data.width);
  }

  // undo button, works local only, not multiplayer
  undoButton.addEventListener('click', () => {
    removeLastLine();
    redrawAll();
  })
  function removeLastLine() {
    points.pop();
    for(var i=points.length-1; i >= 0; i--){
      if(points[i].mode == "begin"){ 
        points.pop();
        break
      }
      points.pop();
    }
  }
  function redrawAll(){
    context.clearRect(0,0,canvas.width,canvas.height);
    onResize();
    if(points.length==0){return;}

    for(var i=0; i < points.length; i++){
      var point = points[i];
      var begin = false;
      context.lineCap = "round";
      context.lineWidth = point.size;  
      context.strokeStyle = point.color;
      if ( point.mode == "begin" || begin ) {
        context.beginPath();
        context.moveTo( point.x, point.y );
      }
      context.lineTo( point.x, point.y );
      if ( point.mode == "end" || ( i == points.length - 1) ) {
        context.stroke();
      }
    }
  }

  // save button 
  saveButton.addEventListener('click',  () => {
    try { 
      var image = canvas.toDataURL();
      var t = document.createElement( 'a' );
      t.download = 'image.png'; 
      t.href = image;  
      t.click();  
    } catch (e) { 
      console.log(e.toString());
    }
  });

  // clear button
  clearButton.addEventListener('click', () => {
    points = [];
    redrawAll();
  })

  // make the canvas fill its parent
  function onResize() {
    canvas.width = window.innerWidth * 0.8;
    canvas.height = window.innerHeight * 0.8;
    context.fillStyle = "#f2f2f2";
    context.fillRect(0, 0, canvas.width, canvas.height);
  }

})();