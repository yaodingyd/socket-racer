const game = (function(){
    
    var r = Math.random;
    
    // -----------------------------
    // ---  closure scoped vars  ---
    // -----------------------------
    var canvas;
    var context;
    var startTime;
    var lastDelta = 0;
    var currentTimeString = "";
    
    var roadParam = {
        maxHeight: 900,
        maxCurve:  400,
        length:    12,
        curvy:     0.8,
        mountainy: 0.8,
        zoneSize:  250
    }
        
    var road = [];
    var keys = [];
    var roadSegmentSize = 5;
    var numberOfSegmentPerColor = 4;
    
    var render = {
        width: 320,
        height: 240,
        depthOfField: 150,
        camera_distance: 30,
        camera_height: 100
    };
    
    var player = {
        position: 10,
        speed: 0,
        acceleration: 0.05,
        deceleration: 0.3,
        breaking: 0.6,
        turning: 5.0,
        posx: 0,
        maxSpeed: 15
    };
    
    var splashInterval;
    var gameInterval;
    
    var car = { 
        x: 0,
        y: 130,
        w: 69,
        h: 38
    };
    var car_4 = { 
        x: 70,
        y: 130,
        w: 77,
        h: 38
    };
    var car_8 = { 
        x: 148,
        y: 130,
        w: 77,
        h: 38
    };
    
    var background = {
        x: 0,
        y: 9,
        w: 320,
        h: 120
    };
    
    var tree = {
        x: 321,
        y: 9,
        w: 23,
        h: 50
    };
    var rock = {
        x: 345,
        y: 9,
        w: 11,
        h: 14
    };
    
    var logo = {
        x: 161,
        y: 39,
        w: 115,
        h: 20
    };
    // -----------------------------
    // -- closure scoped function --
    // -----------------------------
    
    //initialize the game
    var init = function(){
        // configure canvas
        canvas = $("#c")[0];
        context = canvas.getContext('2d');
        
        canvas.height = render.height;
        canvas.width = render.width;
        
        resize();
        $(window).resize(resize);    
        
        generateRoad();
    };
    
    //renders Splash Frame
    var renderSplashFrame = function(){
        context.fillStyle = "rgb(0,0,0)";
        context.fillRect(0, 0, render.width, render.height);
        
        context.drawImage(spritesheet,  357, 9, 115, 20, 100, 20, 115, 40);
        
        drawString("Room number is: " + room,{x: 60, y: 90});
        drawString("Use your phone to connect room",{x: 40, y: 100});
        drawString("Original game: Selim Arsever",{x: 55, y: 120});
        drawString("font: spicypixel.net",{x: 70, y: 130});
        drawString("Modified by yaodingyd",{x: 70, y: 140});
        if(start){
            clearInterval(splashInterval);
            gameInterval = setInterval(renderGameFrame, 30);
            startTime= new Date();
            start = false;
        }
    }
    
    //renders one frame
    var renderGameFrame = function(){
        
        // Clean screen
        context.fillStyle = "#dc9";
        context.fillRect(0, 0, render.width, render.height);
        
        // --------------------------
        // -- Update the car state --
        // --------------------------
        
        if (Math.abs(lastDelta) > 130){
            if (player.speed > 3) {
                player.speed -= 0.2;
            }
        } else {
            // read acceleration controls
            if (gas) { // 38 up
                //player.position += 0.1;
                player.speed += player.acceleration;
            } else if (breaking) { // 40 down
                player.speed -= player.breaking;
            } else {
                player.speed -= player.deceleration;
            }
        }
        player.speed = Math.max(player.speed, 0); //cannot go in reverse
        player.speed = Math.min(player.speed, player.maxSpeed); //maximum speed
        player.position += player.speed;
        
        // car turning
        if (left) {
            // 37 left
            if(player.speed > 0){
                player.posx -= player.turning;
            }
            var carSprite = {
                a: car_4,
                x: 117,
                y: 190
            };
        } else if (right) {
            // 39 right
            if(player.speed > 0){
                player.posx += player.turning;
            }
            var carSprite = {
                a: car_8,
                x: 125,
                y: 190
            };
        } else {
            var carSprite = {
                a: car, 
                x:125, 
                y:190
            };
        }
        

        drawBackground(-player.posx);

        var spriteBuffer = [];
        
        // --------------------------
        // --   Render the road    --
        // --------------------------
        var absoluteIndex = Math.floor(player.position / roadSegmentSize);
        
        if(absoluteIndex >= roadParam.length-render.depthOfField-1){
            clearInterval(gameInterval);
            drawString("You did it!", {x: 100, y: 20});
            drawString("Press t to tweet your time.", {x: 30, y: 30});
            $(window).keydown(function(e){ if(e.keyCode == 84) {location.href="http://twitter.com/home?status="+escape("I've just raced through #racer10k in "+currentTimeString+"!")}});
        }
        
        var currentSegmentIndex    = (absoluteIndex - 2) % road.length;
        var currentSegmentPosition = (absoluteIndex - 2) * roadSegmentSize - player.position;
        var currentSegment         = road[currentSegmentIndex];
        
        var lastProjectedHeight     = Number.POSITIVE_INFINITY;
        var probedDepth             = 0;
        var counter                 = absoluteIndex % (2 * numberOfSegmentPerColor); // for alternating color band
        
        var playerPosSegmentHeight     = road[absoluteIndex % road.length].height;
        var playerPosNextSegmentHeight = road[(absoluteIndex + 1) % road.length].height;
        var playerPosRelative          = (player.position % roadSegmentSize) / roadSegmentSize;
        var playerHeight               = render.camera_height + playerPosSegmentHeight + (playerPosNextSegmentHeight - playerPosSegmentHeight) * playerPosRelative;
        
        var baseOffset                 =  currentSegment.curve + (road[(currentSegmentIndex + 1) % road.length].curve - currentSegment.curve) * playerPosRelative;
        
        lastDelta = player.posx - baseOffset*2;
        
        var iter = render.depthOfField;
        while (iter--) {
            // Next Segment:
            var nextSegmentIndex       = (currentSegmentIndex + 1) % road.length;
            var nextSegment            = road[nextSegmentIndex];
            
            var startProjectedHeight = Math.floor((playerHeight - currentSegment.height) * render.camera_distance / (render.camera_distance + currentSegmentPosition));
            var startScaling         = 30 / (render.camera_distance + currentSegmentPosition);
        
            var endProjectedHeight   = Math.floor((playerHeight - nextSegment.height) * render.camera_distance / (render.camera_distance + currentSegmentPosition + roadSegmentSize));
            var endScaling           = 30 / (render.camera_distance + currentSegmentPosition + roadSegmentSize);

            var currentHeight        = Math.min(lastProjectedHeight, startProjectedHeight);
            var currentScaling       = startScaling;
            
            if(currentHeight > endProjectedHeight){
                drawSegment(
                    render.height / 2 + currentHeight, 
                    currentScaling, currentSegment.curve - baseOffset - lastDelta * currentScaling, 
                    render.height / 2 + endProjectedHeight, 
                    endScaling, 
                    nextSegment.curve - baseOffset - lastDelta * endScaling, 
                    counter < numberOfSegmentPerColor, currentSegmentIndex == 2 || currentSegmentIndex == (roadParam.length-render.depthOfField));
            }
            if(currentSegment.sprite){
                spriteBuffer.push({
                    y: render.height / 2 + startProjectedHeight, 
                    x: render.width / 2 - currentSegment.sprite.pos * render.width * currentScaling + /* */currentSegment.curve - baseOffset - (player.posx - baseOffset*2) * currentScaling,
                    ymax: render.height / 2 + lastProjectedHeight, 
                    s: 2.5*currentScaling, 
                    i: currentSegment.sprite.type});
            }
            
            
            lastProjectedHeight    = currentHeight;
            
            probedDepth            = currentSegmentPosition;

            currentSegmentIndex    = nextSegmentIndex;
            currentSegment         = nextSegment;
            
            currentSegmentPosition += roadSegmentSize;
            
            counter = (counter + 1) % (2 * numberOfSegmentPerColor);
        }
        
        while(sprite = spriteBuffer.pop()) {
            drawSprite(sprite);
        }
        
        // --------------------------
        // --     Draw the car     --
        // --------------------------
        drawImage(carSprite.a, carSprite.x, carSprite.y, 1);

        // --------------------------
        // --     Draw the hud     --
        // --------------------------        
        drawString(""+Math.round(absoluteIndex/(roadParam.length-render.depthOfField)*100)+"%",{x: 287, y: 1});
        var now = new Date();
        var diff = now.getTime() - startTime.getTime();
        
        var min = Math.floor(diff / 60000);
        
        var sec = Math.floor((diff - min * 60000) / 1000); 
        if(sec < 10) sec = "0" + sec;
        
        var mili = Math.floor(diff - min * 60000 - sec * 1000);
        if(mili < 100) mili = "0" + mili;
        if(mili < 10) mili = "0" + mili;
        
        currentTimeString = ""+min+":"+sec+":"+mili;
        
        drawString(currentTimeString, {x: 1, y: 1});
        var speed = Math.round(player.speed / player.maxSpeed * 200);
        drawString(""+speed+"mph", {x: 1, y: 10});
    };
    
    
    // Drawing primitive
    var drawImage = function(image, x, y, scale){
        context.drawImage(spritesheet,  image.x, image.y, image.w, image.h, x, y, scale*image.w, scale*image.h);
    };
    var drawSprite = function(sprite){
        //if(sprite.y <= sprite.ymax){
            var destY = sprite.y - sprite.i.h * sprite.s;
            if(sprite.ymax < sprite.y) {
                var h = Math.min(sprite.i.h * (sprite.ymax - destY) / (sprite.i.h * sprite.s), sprite.i.h);
            } else {
                var h = sprite.i.h; 
            }
            //sprite.y - sprite.i.h * sprite.s
            if(h > 0) context.drawImage(spritesheet,  sprite.i.x, sprite.i.y, sprite.i.w, h, sprite.x, destY, sprite.s * sprite.i.w, sprite.s * h);
        //}
    };
    
    var drawSegment = function (position1, scale1, offset1, position2, scale2, offset2, alternate, finishStart){
        var grass     = (alternate) ? "#eda" : "#dc9";
        var border    = (alternate) ? "#e00" : "#fff";
        var road      = (alternate) ? "#999" : "#777";
        var lane      = (alternate) ? "#fff" : "#777";

        if(finishStart){
            road = "#fff";
            lane = "#fff";
            border = "#fff";
        }
        

        //draw grass:
        context.fillStyle = grass;
        context.fillRect(0,position2,render.width,(position1-position2));
        
        // draw the road
        drawTrapez(position1, scale1, offset1, position2, scale2, offset2, -0.5, 0.5, road);
        
        //draw the road border
        drawTrapez(position1, scale1, offset1, position2, scale2, offset2, -0.5, -0.47, border);
        drawTrapez(position1, scale1, offset1, position2, scale2, offset2, 0.47,   0.5, border);
        
        // draw the lane line
        drawTrapez(position1, scale1, offset1, position2, scale2, offset2, -0.18, -0.15, lane);
        drawTrapez(position1, scale1, offset1, position2, scale2, offset2,  0.15,  0.18, lane);
    }
    
    var drawTrapez = function(pos1, scale1, offset1, pos2, scale2, offset2, delta1, delta2, color){
        var demiWidth = render.width / 2;
        
        context.fillStyle = color;
        context.beginPath();
        context.moveTo(demiWidth + delta1 * render.width * scale1 + offset1, pos1);
        context.lineTo(demiWidth + delta1 * render.width * scale2 + offset2, pos2); 
        context.lineTo(demiWidth + delta2 * render.width * scale2 + offset2, pos2); 
        context.lineTo(demiWidth + delta2 * render.width * scale1 + offset1, pos1);
        context.fill();
    }
    
    var drawBackground = function(position) {
        var first = position / 2 % (background.w);
        drawImage(background, first-background.w +1, 0, 1);
        drawImage(background, first+background.w -1, 0, 1);
        drawImage(background, first, 0, 1);
    }
        
    var drawString = function(string, pos) {
        string = string.toUpperCase();
        var cur = pos.x;
        for(var i=0; i < string.length; i++) {
            context.drawImage(spritesheet, (string.charCodeAt(i) - 32) * 8, 0, 8, 8, cur, pos.y, 8, 8);
            cur += 8;
        }
    }    
    var resize = function(){
        if ($(window).width() / $(window).height() > render.width / render.height) {
            var scale = $(window).height() / render.height;
        }
        else {
            var scale = $(window).width() / render.width;
        }
        
        var transform = "scale(" + scale + ")";
        $("#c").css("MozTransform", transform).css("transform", transform).css("WebkitTransform", transform).css({
            top: (scale - 1) * render.height / 2,
            left: (scale - 1) * render.width / 2 + ($(window).width() - render.width * scale) / 2
        });
    };
    
    // -------------------------------------
    // ---  Generates the road randomly  ---
    // -------------------------------------
    var generateRoad = function(){
        var currentStateH = 0; //0=flat 1=up 2= down
        var transitionH = [[0,1,2],[0,2,2],[0,1,1]];
        
        var currentStateC = 0; //0=straight 1=left 2= right
        var transitionC = [[0,1,2],[0,2,2],[0,1,1]];

        var currentHeight = 0;
        var currentCurve  = 0;

        var zones     = roadParam.length;
        while(zones--){
            // Generate current Zone
            var finalHeight;
            switch(currentStateH){
                case 0:
                    finalHeight = 0; break;
                case 1:
                    finalHeight = roadParam.maxHeight * r(); break;
                case 2:
                    finalHeight = - roadParam.maxHeight * r(); break;
            }
            var finalCurve;
            switch(currentStateC){
                case 0:
                    finalCurve = 0; break;
                case 1:
                    finalCurve = - roadParam.maxCurve * r(); break;
                case 2:
                    finalCurve = roadParam.maxCurve * r(); break;
            }

            for(var i=0; i < roadParam.zoneSize; i++){
                // add a tree
                if(i % roadParam.zoneSize / 4 == 0){
                    var sprite = {type: rock, pos: -0.55};
                } else {
                    if(r() < 0.05) {
                        var spriteType = tree;//([tree,rock])[Math.floor(r()*1.9)];
                        var sprite = {type: spriteType, pos: 0.6 + 4*r()};
                        if(r() < 0.5){
                            sprite.pos = -sprite.pos;
                        }
                    } else {
                        var sprite = false;
                    }
                }
                road.push({
                    height: currentHeight+finalHeight / 2 * (1 + Math.sin(i/roadParam.zoneSize * Math.PI-Math.PI/2)),
                    curve: currentCurve+finalCurve / 2 * (1 + Math.sin(i/roadParam.zoneSize * Math.PI-Math.PI/2)),
                    sprite: sprite
                })
            }
            currentHeight += finalHeight;
            currentCurve += finalCurve;
            // Find next zone
            if(r() < roadParam.mountainy){
                currentStateH = transitionH[currentStateH][1+Math.round(r())];
            } else {
                currentStateH = transitionH[currentStateH][0];
            }
            if(r() < roadParam.curvy){
                currentStateC = transitionC[currentStateC][1+Math.round(r())];
            } else {
                currentStateC = transitionC[currentStateC][0];
            }
        }
        roadParam.length = roadParam.length * roadParam.zoneSize;
    };
    
    return {
        start: function(){
            init();
            spritesheet = new Image();
            spritesheet.onload = function(){
                splashInterval = setInterval(renderSplashFrame, 30);
            };
            spritesheet.src = "spritesheet.high.png";
        }
    }
}());

const socket = io('https://socket-racer-js.herokuapp.com/');
const controller = $('#controller');
const gameCanvas = $('#c');

let room = null;
let start = false;
let gas = false;
let breaking = false;
let left = false;
let right = false;
let base = null;
let isMobile = _isMobile();

if (isMobile) {
    controllerInit();
} else {
    gameInit();
}

function gameInit () {
    gameCanvas.show();
    
    socket.on('ROOM', no => {
        room = no;
    });

    socket.on('JOIN_ROOM', () => {
        start = true;
    });

    socket.on('GAS', data => {
        gas = data;
    });

    socket.on('BREAKING', data => {
        breaking = data;
    });

    socket.on('STEERING', data => {
        left = data.left;
        right = data.right;
    });

    game.start();
}

function controllerInit () {
    controller.show();

    $('#start').click(() => {
        window.addEventListener('deviceorientation',_throttle(_handleOrientation,30));
        start = true;
        room = parseInt($('#room').val().trim());
        socket.emit('SWITCH_ROOMS', {
            new_room: room
        });
    })

    $('#gas').on('touchstart', () => {
        socket.emit('SEND_GAS', {
            gas: true,
            room: room
        });
    })

    $('#gas').on('touchend', () => {
        socket.emit('SEND_GAS', {
            gas: false,
            room: room
        });
    })

    $('#break').on('touchstart', () => {
        socket.emit('SEND_BREAKING', {
            breaking: true,
            room: room
        });
    })

    $('#break').on('touchend', () => {
        socket.emit('SEND_BREAKING', {
            breaking: false,
            room: room
        });
    })

    function _handleOrientation (event) {
        if (start && base == null) {
            base = event.gamma;
        }
        if (event.gamma - base > 25) {
            right = true;
            left = false;
        } else if (event.gamma - base < -25) {
            right = false;
            left = true;
        } else {
            left = false;
            right = false;
        }
        socket.emit("SEND_STEERING", {
            room: room,
            left: left,
            right: right
        });
    }
}

function _isMobile () {
    // const w = window,
    //   d = document,
    //   e = d.documentElement,
    //   g = d.getElementsByTagName("body")[0];
    // const screenWidth = w.innerWidth || e.clientWidth || g.clientWidth;

    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
}

// simply version
function _throttle (callback, limit) {

    var wait = false;
    return function () {
      if (!wait) {
  
        callback.apply(null, arguments);
        wait = true;
        setTimeout(function () {
          wait = false;
        }, limit);
      }
    }
  }
