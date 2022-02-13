'use strict';

(function() {

  var socket = io();
  var canvas = document.getElementsByClassName('whiteboard')[0];
  var colorInput = document.getElementById('fav-color');
  var saveButton = document.getElementById('save-button');
  var undoButton = document.getElementById('undo-button');
  var clearButton = document.getElementById('clear-button');
  var lineWidth = document.getElementById('line-width');
  var context = canvas.getContext('2d');

  var color = '#000000';
  var lastX, lastY;
  var mouseX, mouseY
  var points = [];

  var drawing = false;
  
  //Desktops
  canvas.addEventListener('mousedown', onMouseDown, false);
  canvas.addEventListener('mouseup', onMouseUp, false);
  canvas.addEventListener('mouseout', onMouseUp, false);
  canvas.addEventListener('mousemove', throttle(onMouseMove, 3), false);
  
  //Touch support for mobile devices
  canvas.addEventListener('touchstart', onMouseDown, false);
  canvas.addEventListener('touchend', onMouseUp, false);
  canvas.addEventListener('touchcancel', onMouseUp, false);
  canvas.addEventListener('touchmove', throttle(onMouseMove, 30), false);


  window.addEventListener('resize', onResize, false);
  onResize();

  //update color on change
  colorInput.addEventListener('change', () => color = colorInput.value)

  socket.on('drawing', onDrawingEvent);

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

    //emit line to server
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

    mouseX = e.clientX||e.touches[0].clientX;
    mouseY = e.clientY||e.touches[0].clientY;

    context.beginPath();
    context.moveTo(mouseX, mouseY);

    drawLine(mouseX, mouseY, e.clientX||e.touches[0].clientX, e.clientY||e.touches[0].clientY, color, lineWidth.value, true);

    points.push({x:mouseX, y:mouseY, size:lineWidth.value, color:color, mode:"begin" });

    lastX=mouseX;
    lastY=mouseY;
  }

  function onMouseUp(){
    if (!drawing) { return; }
    points.push({ x:mouseX, y:mouseY, size:lineWidth.value, color:color, mode:"end" });
    drawing = false;
  }



  function onMouseMove(e){
    if (!drawing) { return; }
    drawLine(mouseX, mouseY, e.clientX||e.touches[0].clientX, e.clientY||e.touches[0].clientY, color, lineWidth.value, true);

    mouseX = e.clientX||e.touches[0].clientX;
    mouseY = e.clientY||e.touches[0].clientY;

    context.lineTo(mouseX,mouseY);
    context.strokeStyle = color;
    context.lineWidth = lineWidth.value;
    context.lineCap = "round";
    context.stroke();     
    lastX=mouseX;
    lastY=mouseY;

    points.push({
      x: mouseX,
      y: mouseY,
      size: lineWidth.value,
      color: color,
      mode: "draw"
    });
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



  function onDrawingEvent(data){
    var w = canvas.width;
    var h = canvas.height;
    drawLine(data.x0 * w, data.y0 * h, data.x1 * w, data.y1 * h, data.color, data.width);
  }



  // undo button
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
    context.lineCap = "round";
    if(points.length==0){return;}

    for(var i=0; i < points.length; i++){
      var point = points[i];
      var begin = false;

      if(context.lineWidth != point.size){
        context.lineWidth = point.size;
      }
      if(context.strokeStyle != point.color){
        context.strokeStyle = point.color;
      }
      if ( point.mode == "begin" || begin ) {
        context.beginPath();
        context.moveTo( point.x, point.y );
      }
      context.lineTo( point.x, point.y );
      if ( point.mode == "end" || ( i == points.length - 1) ) {
        context.stroke();
      }
    }
    context.stroke();
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
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight - 75;
    context.fillStyle = "white";
    context.fillRect(0, 0, canvas.width, canvas.height);
  }

})();