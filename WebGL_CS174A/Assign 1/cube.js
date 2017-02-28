"use strict";

var canvas;
var gl;

var NumVertices  = 36;
var NumEdgeVertices = 24;

var points = [];     //For the cube vertices
var edgePoints = []; //The outline vertices

var crosshairPoints = [ //Crosshair vertices
        vec4(0.10, 0.0, 0.0, 1.0),
        vec4(-0.10, 0.0, 0.0, 1.0),
        vec4(0.0, 0.10, 0.0, 1.0),
        vec4(0.0, -0.10, 0.0, 1.0)
];

var colors = [
        [ 1.0, 0.5, 0.0, 1.0 ],  // 
        [ 1.0, 0.0, 0.0, 1.0 ],  // red
        [ 1.0, 1.0, 0.0, 1.0 ],  // yellow
        [ 0.0, 1.0, 0.0, 1.0 ],  // green
        [ 0.0, 0.0, 1.0, 1.0 ],  // blue
        [ 1.0, 0.0, 1.0, 1.0 ],  // magenta
        [ 0.0, 1.0, 1.0, 1.0 ],  // cyan
        [ 0.0, 0.5, 1.0, 1.0 ]   // 
    ];

var vertices = [
        vec4( -0.5, -0.5,  0.5, 1.0 ),
        vec4( -0.5,  0.5,  0.5, 1.0 ),
        vec4(  0.5,  0.5,  0.5, 1.0 ),
        vec4(  0.5, -0.5,  0.5, 1.0 ),
        vec4( -0.5, -0.5, -0.5, 1.0 ),
        vec4( -0.5,  0.5, -0.5, 1.0 ),
        vec4(  0.5,  0.5, -0.5, 1.0 ),
        vec4(  0.5, -0.5, -0.5, 1.0 )
];

var x = 0; //For translating the camera
var y = 0;
var z = 0;

var theta = 0; //For rotating the camera
var phi = 0;
var crosshairEnabled = false;

var fov = 50; //Initial field of view

var color;
var modelViewMatrix;
var projectionMatrix;

var vBuffer;
var vPosition;
var program;

window.onload = function init()
{
    canvas = document.getElementById( "gl-canvas" );

    gl = WebGLUtils.setupWebGL( canvas );
    if ( !gl ) { alert( "WebGL isn't available" ); }

    

    gl.viewport( 0, 0, canvas.width, canvas.height );
    gl.clearColor( 0.0, 0.0, 0.0, 1.0 );
    gl.enable(gl.DEPTH_TEST);

    cube(); //Build a cube object
    cubeOutline(vertices);

    //
    //  Load shaders and initialize attribute buffers
    //
    program = initShaders( gl, "vertex-shader", "fragment-shader" );
    gl.useProgram( program );

   

    vBuffer = gl.createBuffer(); //The cubes themselves will go in this buffer
    gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(points), gl.STATIC_DRAW );

    vPosition = gl.getAttribLocation( program, "vPosition" );
    gl.vertexAttribPointer( vPosition, 4, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vPosition );

    color = gl.getUniformLocation(program, "vColor");
    modelViewMatrix = gl.getUniformLocation(program, "modelViewMatrix");

    window.onkeydown = function (e) {
        e = e || window.event;

        //Problem 5: On 'c' keypress, cycle through cube color
        if (e.keyCode == 67) {
            cycleArray(colors);
            render();
        }
        //Problem 7: up arrow => move up
        else if (e.keyCode == 38) {
            y -= 0.25;
            render();
        }
        //Problem7: down arrow => move down
        else if (e.keyCode == 40) {
            y += 0.25;
            render();
        }
        //Problem 8: right arrow => rotate camera right
        else if (e.keyCode == 39) {
            theta += 4;
            render();
        } 
        //Problem 8: left arrow => rotate camera left
        else if (e.keyCode == 37) {
            theta -= 4;
            render();
        }
        //Problem 9: 'i' keypress => move forward (AKA move scene towards camera)
        else if (e.keyCode == 73) {
            z += 0.25*Math.cos(theta*(Math.PI/180));
            x -= 0.25*Math.sin(theta*(Math.PI/180));
            render();
        }
        //Problem 9: 'k' keypress => move backward
        else if (e.keyCode== 75) {
            z -= 0.25*Math.cos(theta*(Math.PI/180));
            x += 0.25*Math.sin(theta*(Math.PI/180));
            render();
        }
        //Problem 9: 'j' => move left
        else if (e.keyCode == 74) {
            z += 0.25*Math.sin(theta*(Math.PI/180));
            x += 0.25*Math.cos(theta*(Math.PI/180));
            render();
        }
        //Problem 9: 'l' => move right
        else if (e.keyCode == 76) {
            z -= 0.25*Math.sin(theta*(Math.PI/180));
            x -= 0.25*Math.cos(theta*(Math.PI/180));
            
            render();
        }
        //Problem 9: 'r' resets everything (rotate, movement, fov)
        else if (e.keyCode == 82) {
            x = 0;
            y = 0;
            z = 0;
            theta = 0;
            fov = 50;
            render();
        }
        //Problem 10: 'n' reduces fov
        else if (e.keyCode == 78) {
            fov -= 1;
            render();
        }
        //Problem 10: 'w' increases fov
        else if (e.keyCode == 87) {
            fov += 1;
            render();
        }
        //Problem 11: '+' adds a crosshair
        else if (e.keyCode == 107) {
            crosshairEnabled = !crosshairEnabled;
            render();
        }

    }
  
    render();
}


function cube() //A helper function for making the cube
{
    quad( 1, 0, 3, 2, vertices );
    quad( 2, 3, 7, 6, vertices );
    quad( 3, 0, 4, 7, vertices );
    quad( 6, 5, 1, 2, vertices );
    quad( 4, 5, 6, 7, vertices );
    quad( 5, 4, 0, 1, vertices );

}

function cubeOutline(vertices) //A helper function for generating points for cube outlines
{
    var edges = [ 0, 1, 1, 2, 2, 3, 3, 0, 4, 7, 4, 5, 5, 6, 6, 7, 0, 4, 3, 7, 2, 6, 1, 5 ];

    for ( var i = 0; i < edges.length; ++i ) {
        edgePoints.push( vertices[edges[i]] );
    }
}


function quad(a, b, c, d, vertices) //A helper function for the cube helper function
{

    var indices = [ a, b, c, a, c, d ];
    

    for ( var i = 0; i < indices.length; ++i ) {
        points.push( vertices[indices[i]] );
    }


}

function cycleArray(array) { //Used to cycle the color array
    //temp. store first element in array
    var first = array[0];
    for (var i = 0; i < array.length-1; i++) {
        array[i] = array[i+1];
    }

    array[array.length-1] = first;
}

function render()
{

    projectionMatrix = perspective(fov, 1, 1, 100);
    

    gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    var ctm = mat4();


    var positions = [ //Positions of all 8 cubes
        vec3(-10, -10, -10),
        vec3(-10, -10, 10),
        vec3(-10, 10, -10),
        vec3(-10, 10, 10),
        vec3(10, -10, -10),
        vec3(10, -10, 10),
        vec3(10, 10, -10),
        vec3(10, 10, 10),
    ];
    var white = [1.0, 1.0, 1.0, 1.0];

    //Draw the actual cubes first
    for (var i = 0; i < 8; i++) { //Apply the current transformation matrix 8 times for 8 different cubes

        var cameraMatrix = mat4();

        //Rotations
        cameraMatrix = mult(cameraMatrix, rotate(theta, [0, 1, 0]));
        


        //Translations
        cameraMatrix = mult(cameraMatrix, translate(0, 0, -50)); 
        cameraMatrix = mult(cameraMatrix, translate(x, y, z));

        ctm = mat4();
        ctm = mult(ctm, projectionMatrix);
        ctm = mult(ctm, cameraMatrix);
        var translateMat = positions[i];

        ctm = mult(ctm, translate(translateMat));
        

        gl.uniform4fv(color, colors[i]);
        gl.uniformMatrix4fv(modelViewMatrix, false, flatten(ctm));
        gl.drawArrays(gl.TRIANGLES, 0, NumVertices);

    }

    //Reset our buffer to our edge buffer
    var edgeBuffer = gl.createBuffer(); //All cube edges
    gl.bindBuffer( gl.ARRAY_BUFFER, edgeBuffer);
    gl.bufferData( gl.ARRAY_BUFFER, flatten(edgePoints), gl.STATIC_DRAW);
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);

    //Draw our outlines
    for (var i = 0; i < 8; i++) { //Apply the current transformation matrix 8 times for 8 different cubes

        var cameraMatrix = mat4();

        //Rotations
        cameraMatrix = mult(cameraMatrix, rotate(theta, [0, 1, 0]));
        


        //Translations
        cameraMatrix = mult(cameraMatrix, translate(0, 0, -50)); 
        cameraMatrix = mult(cameraMatrix, translate(x, y, z));

        ctm = mat4();
        ctm = mult(ctm, projectionMatrix);
        ctm = mult(ctm, cameraMatrix);
        var translateMat = positions[i];

        ctm = mult(ctm, translate(translateMat));
        

        gl.uniform4fv(color, white);
        gl.uniformMatrix4fv(modelViewMatrix, false, flatten(ctm));
        gl.drawArrays(gl.LINES, 0, NumEdgeVertices);
    }

    //If our crosshair is set, draw it by creating a new buffer for it
    if (crosshairEnabled) {
        var crosshairBuffer = gl.createBuffer();
        gl.bindBuffer( gl.ARRAY_BUFFER, crosshairBuffer);
        gl.bufferData( gl.ARRAY_BUFFER, flatten(crosshairPoints), gl.STATIC_DRAW);
        gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);

        ctm = mat4(); //Transformation will stay the identity matrix (same effect as ortho projection)

        gl.uniform4fv(color, white);
        gl.uniformMatrix4fv(modelViewMatrix, false, flatten(ctm));
        gl.drawArrays(gl.LINES, 0, 4);

    }

    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0); 
    
   // requestAnimFrame( render );
}
