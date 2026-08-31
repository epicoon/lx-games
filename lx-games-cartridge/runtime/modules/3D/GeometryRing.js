// @lx:module lxGames.threed.GeometryRing;

lx.import(lxGames.threed);

// @lx:namespace lxGames.threed;
class GeometryRing extends THREE.Geometry {
    constructor(r, height, depth, angle, sectors) {
        super();
        const geom = __calc(r, height, depth, angle, sectors);
        this.vertices = geom.vertices;
        this.faces = geom.faces;
        this.faceVertexUvs[0] = geom.uvs;
        this.mergeVertices();
        this.computeFaceNormals();
    }
}

function __calc(r, height, depth, angle, sectors) {
    sectors = sectors || lxGames.threed.SMOOTH;
    var step = angle / sectors;
    var innerR = r - depth;
    var vertices = [];
    for (var i=0; i<sectors+1; i++) {
        vertices.push( new THREE.Vector3(innerR * Math.cos(i * step), height/2, innerR * Math.sin(i * step)) );
        vertices.push( new THREE.Vector3(innerR * Math.cos(i * step), -height/2, innerR * Math.sin(i * step)) );
        vertices.push( new THREE.Vector3(r * Math.cos(i * step), height/2, r * Math.sin(i * step)) );
        vertices.push( new THREE.Vector3(r * Math.cos(i * step), -height/2, r * Math.sin(i * step)) );
    }
    var faces = [];
    var uvs = [];
    var j = 0;

    for (var i=0; i<sectors*4; i+=4) {
        faces.push( new THREE.Face3(i, i+1, i+5) );    // inner
        faces.push( new THREE.Face3(i, i+5, i+4) );    // inner
        faces.push( new THREE.Face3(i+2, i+7, i+3) );  // outer
        faces.push( new THREE.Face3(i+2, i+6, i+7) );  // outer
        faces.push( new THREE.Face3(i, i+6, i+2) );    // up
        faces.push( new THREE.Face3(i, i+4, i+6) );    // up
        faces.push( new THREE.Face3(i+1, i+3, i+7) );  // down
        faces.push( new THREE.Face3(i+1, i+7, i+5) );  // down

        // for textures
        var x1 = (parseFloat(i)/4 + 1.0) / parseFloat(sectors);
        var x2 = (parseFloat(i)/4) / parseFloat(sectors);
        uvs.push([]);
        uvs[j].push( new THREE.Vector2(x2, 1.0) );
        uvs[j].push( new THREE.Vector2(x2, 0.0) );
        uvs[j].push( new THREE.Vector2(x1, 0.0) );
        j++;
        uvs.push([]);
        uvs[j].push( new THREE.Vector2(x2, 1.0) );
        uvs[j].push( new THREE.Vector2(x1, 0.0) );
        uvs[j].push( new THREE.Vector2(x1, 1.0) );
        j++;
        uvs.push([]);
        uvs[j].push( new THREE.Vector2(x2, 1.0) );
        uvs[j].push( new THREE.Vector2(x1, 0.0) );
        uvs[j].push( new THREE.Vector2(x2, 0.0) );
        j++;
        uvs.push([]);
        uvs[j].push( new THREE.Vector2(x2, 1.0) );
        uvs[j].push( new THREE.Vector2(x1, 1.0) );
        uvs[j].push( new THREE.Vector2(x1, 0.0) );
        j++;
        uvs.push([]);
        uvs[j].push( new THREE.Vector2(x2, 1.0) );
        uvs[j].push( new THREE.Vector2(x1, 0.0) );
        uvs[j].push( new THREE.Vector2(x2, 0.0) );
        j++;
        uvs.push([]);
        uvs[j].push( new THREE.Vector2(x2, 1.0) );
        uvs[j].push( new THREE.Vector2(x1, 1.0) );
        uvs[j].push( new THREE.Vector2(x1, 0.0) );
        j++;
        uvs.push([]);
        uvs[j].push( new THREE.Vector2(x2, 0.0) );
        uvs[j].push( new THREE.Vector2(x2, 1.0) );
        uvs[j].push( new THREE.Vector2(x1, 1.0) );
        j++;
        uvs.push([]);
        uvs[j].push( new THREE.Vector2(x2, 0.0) );
        uvs[j].push( new THREE.Vector2(x1, 1.0) );
        uvs[j].push( new THREE.Vector2(x1, 0.0) );
        j++;
    }

    if (angle < Math.PI*2) {
        faces.push( new THREE.Face3(0, 2, 1) );
        faces.push( new THREE.Face3(1, 2, 3) );
        var vers = sectors * 4;
        faces.push( new THREE.Face3(vers+0, vers+1, vers+2) );
        faces.push( new THREE.Face3(vers+1, vers+3, vers+2) );
        j = uvs.length;
        uvs.push([]);
        uvs[j].push( new THREE.Vector2(1.0, 1.0) );
        uvs[j].push( new THREE.Vector2(0.0, 1.0) );
        uvs[j].push( new THREE.Vector2(1.0, 0.0) );
        j++;
        uvs.push([]);
        uvs[j].push( new THREE.Vector2(1.0, 0.0) );
        uvs[j].push( new THREE.Vector2(0.0, 1.0) );
        uvs[j].push( new THREE.Vector2(0.0, 0.0) );
        j++;
        uvs.push([]);
        uvs[j].push( new THREE.Vector2(0.0, 1.0) );
        uvs[j].push( new THREE.Vector2(0.0, 0.0) );
        uvs[j].push( new THREE.Vector2(1.0, 1.0) );
        j++;
        uvs.push([]);
        uvs[j].push( new THREE.Vector2(0.0, 0.0) );
        uvs[j].push( new THREE.Vector2(1.0, 0.0) );
        uvs[j].push( new THREE.Vector2(1.0, 1.0) );
        j++;
    }

    return {vertices, faces, uvs};
}
