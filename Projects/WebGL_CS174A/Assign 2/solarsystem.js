var canvas;
var gl;
var time = 0.0;
var timer = new Timer();

var numTimesToSubdivide = 3;

var shadingUsed = "flat";

var pointsArray = [];
var normalsArray = [];
var index = 0;

var x = 0; // x-axis displacement from origin (controls right/left)
var y = -5; // y-axis displacement from origin (controls up/down)
var z = -16; // z-axis displacement from origin (controls back/forward)
var xtemp = x; 
var ytemp = y; 
var ztemp = z;

var theta = 0;
var phi = 0;
var thetatemp = theta;
var phitemp = phi;


//Transformation Matrices
var mvMatrix, pMatrix;
var uniform_mvMatrix, uniform_pMatrix;
var viewMatrix;

//Light Position
var uniform_mvLightMatrix;
var uniform_lightPosition;
var attribute_position;
var attribute_normal;

// buffers for vertices and normals
var positionBuffer_low;
var normalBuffer_low;
var positionBuffer_med;
var normalBuffer_med;
var positionBuffer_higher;
var normalBuffer_higher;
var positionBuffer_high;
var normalBuffer_high;

//Light products for vertex shader
//We'll need two uniforms because of the possibility of either gouraud or phong shading
var uniform_ambientProduct;
var uniform_diffuseProduct;
var uniform_specularProduct;
var uniform_shininess;

var uniform_ambientProduct2;
var uniform_diffuseProduct2;
var uniform_specularProduct2;
var uniform_shininess2;

//Actual light products
var ambientProduct, diffuseProduct, specularProduct;

//Variables to help us determine if by vertex or by fragment
var uniform_perVertex, uniform_perFragment;


//Camera stuff

var eye = vec3(0, 0, 0);
var at = vec3(0.0, 0.0, 0.0);
var up = vec3(0.0, 1.0, 0.0);
var step = 1; //For camera movement
var attached = false;
var eyeAttached;


var ambientColor, diffuseColor, specularColor;

/************ Planet and Sun Data ****************/
var sunPositionZ = -20;
var planetScale = [5, 1.3, 2, 0.9, 1.5, 0.3 ];
var distanceFromSun = [0, 7, 13, 19, 25, 21];
var orbitSpeed = [0, 55, 45, 25, 35, 100];

/*Lighting Stuff*/
//Each index represents sun, first planet, 2nd planet, moon etc
var ambientProductArray = [
    mult(vec4(0.3, 0.3, 0.3, 1.0), vec4(1.0, 0.27, 0.0, 1.0)),
    mult(vec4(0.3, 0.3, 0.3, 1.0), vec4(0.75, 0.76, 0.78, 1.0)),
    mult(vec4(0.3, 0.3, 0.3, 1.0), vec4(0.07, 0.55, 0.43, 1.0)),
    mult(vec4(0.3, 0.3, 0.3, 1.0), vec4(0.0, 0.75, 1.0, 1.0)),
    mult(vec4(0.3, 0.3, 0.3, 1.0), vec4(0.6, 0.25, 0.14, 1.0)),
    mult(vec4(0.3, 0.3, 0.3, 1.0), vec4(1.0, 1.0, 0.7, 1.0)),
];
var diffuseProductArray = [
    mult(vec4(0.5, 0.5, 0.5, 1.0), vec4(1.0, 0.27, 0.0, 1.0)),
    mult(vec4(0.5, 0.5, 0.5, 1.0), vec4(0.75, 0.76, 0.78, 1.0)),
    mult(vec4(0.5, 0.5, 0.5, 1.0), vec4(0.07, 0.55, 0.43, 1.0)),
    mult(vec4(0.5, 0.5, 0.5, 1.0), vec4(0.0, 0.75, 1.0, 1.0)),
    mult(vec4(0.5, 0.5, 0.5, 1.0), vec4(0.6, 0.25, 0.14, 1.0)),
    mult(vec4(0.5, 0.5, 0.5, 1.0), vec4(1.0, 1.0, 0.7, 1.0)),
];
var specularProductArray = [
    mult(vec4(0.3, 0.3, 0.3, 1.0), vec4(1.0, 0.27, 0.0, 1.0)),
    mult(vec4(0.6, 0.6, 0.6, 1.0), vec4(0.75, 0.76, 0.78, 1.0)),
    mult(vec4(0.9, 0.9, 0.9, 1.0), vec4(0.07, 0.55, 0.43, 1.0)),
    mult(vec4(0.8, 0.8, 0.8, 1.0), vec4(0.0, 0.75, 1.0, 1.0)),
    mult(vec4(0.9, 0.9, 0.9, 1.0), vec4(0.6, 0.25, 0.14, 1.0)),
    mult(vec4(0.5, 0.5, 0.5, 1.0), vec4(1.0, 1.0, 0.7, 1.0)),
];
var materialShininess = 50.0;
var lightPosition = vec3(0.0, 0.0, sunPositionZ);

//Vectors used for sphere generation
var va = vec4(0.0, 0.0, -1.0, 1);
var vb = vec4(0.0, 0.942809, 0.333333, 1);
var vc = vec4(-0.816497, -0.471405, 0.333333, 1);
var vd = vec4(0.816497, -0.471405, 0.333333, 1);

function triangle(a, b, c, shading) {
     pointsArray.push(a); 
     pointsArray.push(b); 
     pointsArray.push(c);  

     if (shading == "flat") { //Produces a normal vector for the entire triangle 
        var t1 = subtract(b, a);
        var t2 = subtract(c, a);
        var normal = normalize(cross(t2, t1));
        normal = vec4(normal);
        normal[3] = 0.0;

        //Test inverse normals, since lighting was appearing on wrong side of planet
        normal = scale(-1, normal);
        normalsArray.push(normal); 
        normalsArray.push(normal); 
        normalsArray.push(normal); 

     } else if (shading == "gouraud" || shading == "phong") { //Produce a normal for each vertex
        /*normalsArray.push(a);
        normalsArray.push(b);
        normalsArray.push(c);*/

        //Test inverse normals, since lighting was appearing on wrong side of planet
        normalsArray.push(scale(-1,a));
        normalsArray.push(scale(-1,b));
        normalsArray.push(scale(-1,c));
     }

     index += 3;
}


function divideTriangle(a, b, c, count, shading) {


    if ( count > 0 ) {
                
        var ab = normalize(mix( a, b, 0.5), true);
        var ac = normalize(mix( a, c, 0.5), true);
        var bc = normalize(mix( b, c, 0.5), true);
                                
        divideTriangle( a, ab, ac, count - 1, shading);
        divideTriangle( ab, b, bc, count - 1, shading);
        divideTriangle( bc, c, ac, count - 1, shading);
        divideTriangle( ab, bc, ac, count - 1, shading);
    }
    else { // draw tetrahedron at end of recursion
        triangle( a, b, c, shading);
    }
}

function tetrahedron(a, b, c, d, n, shading) { //n = number of vertices (approx)
    pointsArray = [];
    normalsArray = [];
    index = 0;

    var subdivisions;
    if (n == 64) subdivisions = 3;
    else if (n == 128) subdivisions = 4;
    else if (n == 256) subdivisions = 5;
    else if (n == 512) subdivisions = 6;
    else if (n > 512) subdivisions = 6;
    else if (n < 64) subdivisions = 2;
    else subdivisions = 4;

    divideTriangle(a, b, c, subdivisions, shading);
    divideTriangle(d, c, b, subdivisions, shading);
    divideTriangle(a, d, b, subdivisions, shading);
    divideTriangle(a, c, d, subdivisions, shading);
}

//n = amount of points
//Complexity 3 = 64 points
//Complexity 4 = 128? points
//Complexity 5 = 256 points
//Complexity 6 = 512 points



window.onload = function init() {
    canvas = document.getElementById( "gl-canvas" );
    
    gl = WebGLUtils.setupWebGL( canvas );
    if ( !gl ) { alert( "WebGL isn't available" ); }

    gl.viewport( 0, 0, canvas.width, canvas.height );
    gl.clearColor( 0.0, 0.0, 0.0, 1.0 );
    gl.enable(gl.DEPTH_TEST);


    //  Load shaders and initialize attribute buffers
    var program = initShaders( gl, "vertex-shader", "fragment-shader" );
    gl.useProgram( program );  


    /************** All Keyboard Input here ****************/


    window.onkeydown = function (e) {
        e = e || window.event;

        if (e.keyCode == 97) {
            step = 1;
        } else if (e.keyCode == 98) {
            step = 2;
        } else if (e.keyCode == 99 ) {
            step = 3;
        } else if (e.keyCode == 100 ) {
            step = 4;
        } else if (e.keyCode == 101 ) {
            step = 5;
        } else if (e.keyCode == 102 ) {
            step = 6;
        } else if (e.keyCode == 103 ) {
            step = 7;
        } else if (e.keyCode == 104) {
            step = 8;
        } else if (e.keyCode == 105 ) {
            step = 9;
        } else if (e.keyCode == 39) { //Right and left arrow keys rotate the camera left/right
            theta += step;
        } else if (e.keyCode == 37) {
            theta -= step;
        } else if (e.keyCode == 38) { //Up and down arrows rotate camera up/down
            phi -= step;
        } else if (e.keyCode == 40) {
            phi += step;
        } else if (e.keyCode == 32 && !attached) { //Hit space => move forward
            y += step*Math.sin(phi*(Math.PI/180));
            z += step*Math.cos(theta*(Math.PI/180));
            x -= step*Math.sin(theta*(Math.PI/180));
        } else if (e.keyCode == 82) { //R -> reset
            attached = false;
            x = 0; y = -5; z = -16;
            theta = 0; phi = 0;
        } else if (e.keyCode == 65) {
            attached = true; //press a to attach camera to planet
            xtemp = x; 
            ytemp = y; 
            ztemp = z;
            phitemp = phi; 
            thetatemp = theta;
            //render();
        }
        else if (e.keyCode == 68 && attached == true) { 
            attached = false; //detach camera
            x = xtemp;
            y = ytemp;
            z = ztemp;
            theta = thetatemp;
            phi = phitemp;

            //render();
        }

    }





    /*********  CREATE OUR NECESSARY BUFFERS ****************/
    //We'll need multiple buffers for lower complexity spheres to higher ones, since we'll store different points
    //And normals for every different planet
    
    //Low complexity (low # of vertices) - 1st planet (Req. #7)
    tetrahedron(va, vb, vc, vd, 64, "flat");

    normalBuffer_low = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, normalBuffer_low);
    gl.bufferData( gl.ARRAY_BUFFER, flatten(normalsArray), gl.STATIC_DRAW);

    positionBuffer_low = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, positionBuffer_low);
    gl.bufferData( gl.ARRAY_BUFFER, flatten(pointsArray), gl.STATIC_DRAW);

    //Med complexity (med # of vertices) - 2nd planet (Req. #8)
    tetrahedron(va, vb, vc, vd, 128, "gouraud");

    normalBuffer_med = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, normalBuffer_med);
    gl.bufferData( gl.ARRAY_BUFFER, flatten(normalsArray), gl.STATIC_DRAW);

    positionBuffer_med = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, positionBuffer_med);
    gl.bufferData( gl.ARRAY_BUFFER, flatten(pointsArray), gl.STATIC_DRAW);

    //Higher complexity (med-high # of vertices) - 4th planet (Req. #10) and SUN
    tetrahedron(va, vb, vc, vd, 256, "phong");

    normalBuffer_higher = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, normalBuffer_higher);
    gl.bufferData( gl.ARRAY_BUFFER, flatten(normalsArray), gl.STATIC_DRAW);

    positionBuffer_higher = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, positionBuffer_higher);
    gl.bufferData( gl.ARRAY_BUFFER, flatten(pointsArray), gl.STATIC_DRAW);

    //High complexity (high # of vertices) - 3rdth planet (Req. #9)
    tetrahedron(va, vb, vc, vd, 512, "phong");

    normalBuffer_high = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, normalBuffer_high);
    gl.bufferData( gl.ARRAY_BUFFER, flatten(normalsArray), gl.STATIC_DRAW);

    positionBuffer_high = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, positionBuffer_high);
    gl.bufferData( gl.ARRAY_BUFFER, flatten(pointsArray), gl.STATIC_DRAW);


    /********* ENABLE SHADER POSTION/NORMAL ATTRIBUTES ************/
    
    attribute_position = gl.getAttribLocation( program, "vPosition");
    gl.vertexAttribPointer( attribute_position, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray( attribute_position);

    attribute_normal = gl.getAttribLocation( program, "vNormal");
    gl.vertexAttribPointer( attribute_normal, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray( attribute_normal);

    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer_low);
    gl.vertexAttribPointer(attribute_position, 4, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer_low);
    gl.vertexAttribPointer(attribute_normal, 4, gl.FLOAT, false, 0, 0); 


    /******* Get all variables from the shaders ***********************/

    uniform_mvMatrix = gl.getUniformLocation( program, "mvMatrix" );
    uniform_pMatrix = gl.getUniformLocation( program, "pMatrix" );

    uniform_lightPosition = gl.getUniformLocation(program, "lightPosition");
    uniform_ambientProduct = gl.getUniformLocation(program, "ambientProduct");
    uniform_diffuseProduct = gl.getUniformLocation(program, "diffuseProduct");
    uniform_specularProduct = gl.getUniformLocation(program, "specularProduct");
    uniform_shininess = gl.getUniformLocation(program, "shininess");

    uniform_ambientProduct2 = gl.getUniformLocation(program, "ambientProduct2");
    uniform_diffuseProduct2 = gl.getUniformLocation(program, "diffuseProduct2");
    uniform_specularProduct2 = gl.getUniformLocation(program, "specularProduct2");
    uniform_shininess2 = gl.getUniformLocation(program, "shininess2");

    uniform_perFragment = gl.getUniformLocation(program, "perFragment");
    uniform_perVertex = gl.getUniformLocation(program, "perVertex");

    gl.uniform1f(uniform_perVertex, false);
    gl.uniform1f(uniform_perFragment, true);

    /********* Camera and perspective stuff *********/

    viewMatrix = lookAt(eye, at , up);
    pMatrix = perspective(70, 1, 0.001, 1000);


    /********* Set light position ********/
    uniform_mvLightMatrix = gl.getUniformLocation(program, "mvLightMatrix");
    mvLightMatrix = viewMatrix;
    mvLightMatrix = mult(mvLightMatrix, rotate(theta, [0, 1, 0]));
    mvLightMatrix = mult(mvLightMatrix, rotate(phi, [1, 0, 0]));
    mvLightmatrix = mult(mvLightMatrix, translate(vec3(x, y, z)));
    mvLightMatrix = mult(mvLightMatrix, translate(vec3(0, 0, sunPositionZ)));
    gl.uniformMatrix4fv(uniform_mvLightMatrix, false, flatten(mvLightMatrix));

    timer.reset();
    render();
}


function render() {
    
    gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    time += timer.getElapsedTime() / 750;

    if (attached) {

        phi = 0;
        y = 0;

        eyeAttached = mat4(); //Have camera be attached to planet??
        eyeAttached = mult(eyeAttached, translate(vec3(0, 0, sunPositionZ)));
        eyeAttached = mult(eyeAttached, rotate(-time*orbitSpeed[2], [0, 1, 0]));
        eyeAttached = mult(eyeAttached, translate(vec3(0, 0, -distanceFromSun[2] )));

        eye = vec3(eyeAttached[0][0], eyeAttached[0][1], eyeAttached[0][2]);
        at = vec3(0, 0, 0);
        up = vec3(0, 1, 0);

        viewMatrix = lookAt(eye, at, up);
    } else {
        eye = vec3(0, 0, 0);
        at = vec3(0, 0, 0);
        up = vec3(0, 1, 0);
        viewMatrix = lookAt(eye, at, up);

        //x = xtemp; y = ytemp; z = ztemp;
        //phi = phitemp; theta = thetatemp;
    }

    setPerVertex();
    drawPlanet(0, 2);
    drawPlanet(1, 0);
    drawPlanet(2, 1);

    setPerFragment();
    drawPlanet(3, 3);
    drawPlanet(4, 2);

    drawMoon();

    window.requestAnimFrame(render);


}

function drawPlanet(j, complexity) { //given an index on which planet we're drawing, and the complexity
    //0 = low, 1 = mediium, 2 = medium-high, 3 = high
    if(complexity==3) {
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer_high);
        gl.vertexAttribPointer(attribute_position, 4, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer_high);
        gl.vertexAttribPointer(attribute_normal, 4, gl.FLOAT, false, 0, 0);
    }
    else if(complexity==2) {
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer_higher);
        gl.vertexAttribPointer(attribute_position, 4, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer_higher);
        gl.vertexAttribPointer(attribute_normal, 4, gl.FLOAT, false, 0, 0);
    }
    else if(complexity==1) {
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer_med);
        gl.vertexAttribPointer(attribute_position, 4, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer_med);
        gl.vertexAttribPointer(attribute_normal, 4, gl.FLOAT, false, 0, 0);
    }
    else {
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer_low);
        gl.vertexAttribPointer(attribute_position, 4, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer_low);
        gl.vertexAttribPointer(attribute_normal, 4, gl.FLOAT, false, 0, 0);
    }

   
   
    gl.uniform3fv(uniform_lightPosition, flatten(lightPosition));
    gl.uniform4fv(uniform_ambientProduct, flatten(ambientProductArray[j]));
    gl.uniform4fv(uniform_diffuseProduct, flatten(diffuseProductArray[j]));
    gl.uniform4fv(uniform_specularProduct, flatten(specularProductArray[j]));
    gl.uniform1f(uniform_shininess, materialShininess);

    gl.uniform4fv(uniform_ambientProduct2, flatten(ambientProductArray[j]));
    gl.uniform4fv(uniform_diffuseProduct2, flatten(diffuseProductArray[j]));
    gl.uniform4fv(uniform_specularProduct2, flatten(specularProductArray[j]));
    gl.uniform1f(uniform_shininess2, materialShininess);
    
    
    mvMatrix = viewMatrix;
    mvMatrix = mult(mvMatrix, rotate(theta, [0, 1, 0]));
    mvMatrix = mult(mvMatrix, rotate(phi, [1, 0, 0]));
    mvMatrix = mult(mvMatrix, translate(vec3(x, y, z)));
    mvMatrix = mult(mvMatrix, translate(vec3(0, 0, sunPositionZ)));
    mvMatrix = mult(mvMatrix, rotate(time*orbitSpeed[j], [0, 1, 0]));
    mvMatrix = mult(mvMatrix, translate(vec3(0, 0, distanceFromSun[j])));
    mvMatrix = mult(mvMatrix, scalem(planetScale[j], planetScale[j], planetScale[j]));

    
    gl.uniformMatrix4fv( uniform_mvMatrix, false, flatten(mvMatrix) );
    gl.uniformMatrix4fv( uniform_pMatrix, false, flatten(pMatrix) ); 
    //gl.uniform4fv(color, colors[1]);
    
        

    for( var i=0; i<index; i+=3) 
       gl.drawArrays( gl.TRIANGLES, i, 3 );

}

function drawMoon() {
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer_higher);
    gl.vertexAttribPointer(attribute_position, 4, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer_higher);
    gl.vertexAttribPointer(attribute_normal, 4, gl.FLOAT, false, 0, 0);

    gl.uniform4fv(uniform_ambientProduct, flatten(ambientProductArray[5]));
    gl.uniform4fv(uniform_diffuseProduct, flatten(diffuseProductArray[5]));
    gl.uniform4fv(uniform_specularProduct, flatten(specularProductArray[5]));

    gl.uniform4fv(uniform_ambientProduct2, flatten(ambientProductArray[5]));
    gl.uniform4fv(uniform_diffuseProduct2, flatten(diffuseProductArray[5]));
    gl.uniform4fv(uniform_specularProduct2, flatten(specularProductArray[5]));
   
    
    mvMatrix = viewMatrix;
    mvMatrix = mult(mvMatrix, rotate(theta, [0, 1, 0]));
    mvMatrix = mult(mvMatrix, rotate(phi, [1, 0, 0]));
    mvMatrix = mult(mvMatrix, translate(vec3(x, y, z)));
    mvMatrix = mult(mvMatrix, translate(vec3(0, 0, sunPositionZ)));
    mvMatrix = mult(mvMatrix, rotate(time*orbitSpeed[4], [0, 1, 0]));
    mvMatrix = mult(mvMatrix, translate(vec3(0, 0, distanceFromSun[4])));
    mvMatrix = mult(mvMatrix, rotate(time*orbitSpeed[5], [0, 1, 0]));
    mvMatrix = mult(mvMatrix, translate(vec3(0, 0, 2)));
    mvMatrix = mult(mvMatrix, scalem(planetScale[5], planetScale[5], planetScale[5]));

    gl.uniformMatrix4fv(uniform_mvMatrix, false, flatten(mvMatrix));
    gl.uniformMatrix4fv(uniform_pMatrix, false, flatten(pMatrix));

    for( var i=0; i<index; i+=3) 
        gl.drawArrays(gl.TRIANGLES, i, 3);

}

function setPerFragment() {
    gl.uniform1f(uniform_perVertex, false);
    gl.uniform1f(uniform_perFragment, true);
}

function setPerVertex() {
    gl.uniform1f(uniform_perVertex, true);
    gl.uniform1f(uniform_perFragment, false);
}