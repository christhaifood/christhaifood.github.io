
/*For some reason my timer function when put in webgl-utils.js wasn't working, so I put it directly in here*/

Timer = function() {
  this.prevTime = 0;//the previously recorded time
  this.nowTime = 0;//current time
  this.reset();
};


/**
 * Set the previous time to current time;
 */
Timer.prototype.reset = function() {
  this.prevTime = this.getNowTime();
  this.nowTime = this.prevTime;
};


/**
 * Get current time.
 * @return {number} current time.
 */
Timer.prototype.getNowTime = function() {
  var time = new Date();
  return time.getTime();
};


/**
 * Get passed time since last time this function
 * get called or since the reset() if first time
 * called.
 * @return {number} dt
 */
Timer.prototype.getElapsedTime = function() {
  var dt = this.getNowTime() - this.prevTime;
  this.prevTime += dt;
  return dt;
};



var canvas;
var gl;
var time = 0.0;
var timer = new Timer();

var NumVertices  = 36;

var points = [];  
var texCoordsArray = []; 
var texCoordsArray2 = [];
var colorsArray = [];

var texture;
var image_doge, image_rocks;
var zoom_texture = false;

var rotateSpeed = [120, 180]; //Rotate speed of the cubes

//Texture coordinates
var texCoord = [
    vec2(0,0),
    vec2(0,1),
    vec2(1,1),
    vec2(1,0)
]

var texCoord_Zoom = [
    vec2(0,0),
    vec2(0,2),
    vec2(2,2),
    vec2(2,0)

]

//Cube vertices
var vertices = [
        vec4( -1, -1,  1, 1.0 ),
        vec4( -1,  1,  1, 1.0 ),
        vec4(  1,  1,  1, 1.0 ),
        vec4(  1, -1,  1, 1.0 ),
        vec4( -1, -1, -1, 1.0 ),
        vec4( -1,  1, -1, 1.0 ),
        vec4(  1,  1, -1, 1.0 ),
        vec4(  1, -1, -1, 1.0 )
];

var x = 0; //For translating the camera
var y = 0;
var z = 0;


var fov = 50; //Initial field of view

var rotation = false;

var color;
var mvMatrix, uniform_mvMatrix;
var pMatrix, uniform_pMatrix;

var vBuffer;
var vPosition;
var tBuffer, tBuffer2;
var vTexCoord;
var vColor;
var cBuffer;

var program;


var white = [1.0, 1.0, 1.0, 1.0];

/*Helper functions to configure the textures for both cubes*/

function configureTexture_rocks( image ) { //Rocks will be texture of 1st cube (nearest neighbor filtering)
    texture = gl.createTexture();
    gl.bindTexture( gl.TEXTURE_2D, texture );
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D( gl.TEXTURE_2D, 0, gl.RGB, 
         gl.RGB, gl.UNSIGNED_BYTE, image );
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, 
                      gl.NEAREST);
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST );
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    
    gl.uniform1i(gl.getUniformLocation(program, "texture"), 0);
}

function configureTexture_doge( image ) { //Grass will be texture with mipmapping w/ trilinear
    texture = gl.createTexture();
    gl.bindTexture( gl.TEXTURE_2D, texture );
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D( gl.TEXTURE_2D, 0, gl.RGB, 
         gl.RGB, gl.UNSIGNED_BYTE, image );
    gl.generateMipmap( gl.TEXTURE_2D );
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, 
                      gl.LINEAR_MIPMAP_LINEAR );
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR );
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    
    gl.uniform1i(gl.getUniformLocation(program, "texture"), 0);
}

window.onload = function init()
{
    canvas = document.getElementById( "gl-canvas" );

    gl = WebGLUtils.setupWebGL( canvas );
    if ( !gl ) { alert( "WebGL isn't available" ); }

    

    gl.viewport( 0, 0, canvas.width, canvas.height );
    gl.clearColor( 0.0, 0.0, 0.0, 1.0 );
    gl.enable(gl.DEPTH_TEST);
    timer.reset();

    cube(); //Build a cube object

    //
    //  Load shaders and initialize attribute buffers
    //
    program = initShaders( gl, "vertex-shader", "fragment-shader" );
    gl.useProgram( program );

    cBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, cBuffer);
    gl.bufferData( gl.ARRAY_BUFFER, flatten(colorsArray), gl.STATIC_DRAW);

    vColor = gl.getAttribLocation(program, "vColor");
    gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vColor);

    vBuffer = gl.createBuffer(); //The cubes themselves will go in this buffer
    gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(points), gl.STATIC_DRAW );

    vPosition = gl.getAttribLocation( program, "vPosition" );
    gl.vertexAttribPointer( vPosition, 4, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vPosition );

    //Create 2 buffers for our texture coordinates (we'll switch between them for each cube)
    tBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, tBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(texCoordsArray), gl.STATIC_DRAW);

    tBuffer2 = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, tBuffer2);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(texCoordsArray2), gl.STATIC_DRAW);


    vTexCoord = gl.getAttribLocation(program, "vTexCoord");
    gl.vertexAttribPointer(vTexCoord, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vTexCoord);

    uniform_mvMatrix = gl.getUniformLocation( program, "mvMatrix" );
    uniform_pMatrix = gl.getUniformLocation( program, "pMatrix" );

    image_doge = document.getElementById("doge");
    image_rocks = document.getElementById("rocks");


    window.onkeydown = function (e) {
        e = e || window.event;
        if (e.keyCode == 73) {
            z += 1;
            render();
        }
        else if (e.keyCode == 79) {
            z -= 1;
            render();
        } else if (e.keyCode == 82) rotation = !rotation;
    }
  
    render();
}


function cube() //A helper function for making the cube
{
    points = [];
    texCoordsArray = [];
    quad( 1, 0, 3, 2, vertices);
    quad( 2, 3, 7, 6, vertices);
    quad( 3, 0, 4, 7, vertices);
    quad( 6, 5, 1, 2, vertices);
    quad( 4, 5, 6, 7, vertices);
    quad( 5, 4, 0, 1, vertices);

}


function quad(a, b, c, d, vertices) //A helper function for the cube helper function
{

    var indices = [ a, b, c, a, c, d ];
    

    for ( var i = 0; i < indices.length; ++i ) {
        points.push( vertices[indices[i]] );
        colorsArray.push(white);
    }



    texCoordsArray2.push(texCoord_Zoom[0]);
    texCoordsArray2.push(texCoord_Zoom[1]);
    texCoordsArray2.push(texCoord_Zoom[2]);
    texCoordsArray2.push(texCoord_Zoom[0]);
    texCoordsArray2.push(texCoord_Zoom[2]);
    texCoordsArray2.push(texCoord_Zoom[3]);
   
    texCoordsArray.push(texCoord[0]);
    texCoordsArray.push(texCoord[1]);
    texCoordsArray.push(texCoord[2]);
    texCoordsArray.push(texCoord[0]);
    texCoordsArray.push(texCoord[2]);
    texCoordsArray.push(texCoord[3]);
    

}

function render()
{

    pMatrix = perspective(fov, 1, 1, 100); 

    gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    //Time -> used to rotate the cubes
    time += timer.getElapsedTime() / 1000;

    var positions = [ //Positions of all 8 cubes
        vec3(-4, 0, 0),
        vec3(4, 0, 0),
    ];

    //Draw cube 1
    
    configureTexture_rocks(image_rocks);

    gl.bindBuffer( gl.ARRAY_BUFFER, tBuffer);
    gl.vertexAttribPointer(vTexCoord, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vTexCoord);

    var cameraMatrix = mat4();
    cameraMatrix = mult(cameraMatrix, translate(0, 0, -20));
    cameraMatrix = mult(cameraMatrix, translate(0, 0, z)); 
    cameraMatrix = mult(cameraMatrix, translate(positions[0]));

    if(rotation) {
        cameraMatrix = mult(cameraMatrix, rotate((time*rotateSpeed[0]), [0, 1, 0]));
    }

    gl.uniformMatrix4fv(uniform_pMatrix, false, flatten(pMatrix));
    gl.uniformMatrix4fv(uniform_mvMatrix, false, flatten(cameraMatrix));
    gl.drawArrays(gl.TRIANGLES, 0, NumVertices);



    //Draw Cube 2  
    configureTexture_doge(image_doge);

    gl.bindBuffer( gl.ARRAY_BUFFER, tBuffer2);
    gl.vertexAttribPointer(vTexCoord, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vTexCoord);

    cameraMatrix = mat4();
    cameraMatrix = mult(cameraMatrix, translate(0, 0, -20)); 
    cameraMatrix = mult(cameraMatrix, translate(0, 0, z));
    cameraMatrix = mult(cameraMatrix, translate(positions[1]));

    if(rotation) {
        cameraMatrix = mult(cameraMatrix, rotate((time*rotateSpeed[1]), [1, 0, 0]));
    }
    

    gl.uniformMatrix4fv(uniform_pMatrix, false, flatten(pMatrix));
    gl.uniformMatrix4fv(uniform_mvMatrix, false, flatten(cameraMatrix));
    gl.drawArrays(gl.TRIANGLES, 0, NumVertices);

   
    window.requestAnimFrame( render );
}

