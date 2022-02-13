'use strict';

(function() {

  var socket = io();
  var canvas = document.getElementsByClassName('whiteboard')[0];
  var colorsButtons = document.getElementsByClassName('color-button');
  var saveButton = document.getElementById('save-button');
  var lineWidthInput = document.getElementById('line-width');
  var context = canvas.getContext('2d');

  var current = {
    color: 'black'
  };

  var drawing = false;

  //Desktops
  canvas.addEventListener('mousedown', onMouseDown, false);
  canvas.addEventListener('mouseup', onMouseUp, false);
  canvas.addEventListener('mouseout', onMouseUp, false);
  canvas.addEventListener('mousemove', throttle(onMouseMove, 10), false);
  
  //Touch support for mobile devices
  canvas.addEventListener('touchstart', onMouseDown, false);
  canvas.addEventListener('touchend', onMouseUp, false);
  canvas.addEventListener('touchcancel', onMouseUp, false);
  canvas.addEventListener('touchmove', throttle(onMouseMove, 10), false);


  window.addEventListener('resize', onResize, false);
  onResize();

  for (var i = 0; i < colorsButtons.length; i++){
    colorsButtons[i].addEventListener('click', onColorUpdate, false);
  }

  socket.on('drawing', onDrawingEvent);

  function drawLine(x0, y0 , x1, y1, color, emit){
    y0 = y0 - 75;
    y1 = y1 - 75;
    context.beginPath();
    context.moveTo(x0, y0);

    
    //context.arc(x1, y1, lineWidthInput.value, 0, 2*Math.PI, false);
    //context.fillStyle = color;
    //context.fill();

    context.lineTo(x1, y1);
    context.strokeStyle = color;
    context.lineWidth = lineWidthInput.value;
    context.lineCap = "round";
    context.stroke();
    context.closePath();

    if (!emit) { return; }
    var w = canvas.width;
    var h = canvas.height;

    socket.emit('drawing', {
      x0: x0 / w,
      y0: y0 / h,
      x1: x1 / w,
      y1: y1 / h,
      color: color
    });
  }

  function onMouseDown(e){
    drawing = true;
    current.x = e.clientX||e.touches[0].clientX;
    current.y = e.clientY||e.touches[0].clientY;
  }

  function onMouseUp(){
    if (!drawing) { return; }
    drawing = false;
  }

  function onMouseMove(e){
    if (!drawing) { return; }
    drawLine(current.x, current.y, e.clientX||e.touches[0].clientX, e.clientY||e.touches[0].clientY, current.color, true);
    current.x = e.clientX||e.touches[0].clientX;
    current.y = e.clientY||e.touches[0].clientY;
  }

  function onColorUpdate(e){
    current.color = e.target.className.split(' ')[1];
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
    drawLine(data.x0 * w, data.y0 * h, data.x1 * w, data.y1 * h, data.color);
  }

  // save button 
  saveButton.addEventListener('click',  () => {
    try { 
      var image = canvas.toDataURL();
      var tmpLink = document.createElement( 'a' );
      tmpLink.download = 'image.png'; // set the name of the download file 
      tmpLink.href = image;  
      tmpLink.click();  
    } catch (e) { 
      console.log(e.toString());
    }
  });

  // make the canvas fill its parent
  function onResize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight -75;
    context.fillStyle = "white";
    context.fillRect(0, 0, canvas.width, canvas.height);
  }

})();