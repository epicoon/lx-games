// @lx:module lxGames.threed.Math;

lx.import(lxGames.threed);

const _Math = lx.globalContext.Math;

// @lx:namespace lxGames.threed;
class Math {
    static roundScalar(scalar) {
        let test = _Math.round(scalar);
        if (_Math.abs(test - scalar) < lxGames.threed.PRECISION)
            return test;
        return scalar;
    }

    static roundVector(v) {
        v.x = this.roundScalar(v.x);
        v.y = this.roundScalar(v.y);
        v.z = this.roundScalar(v.z);
        return v;
    }

    static zeroScalar(s) {
        return _Math.abs(s) < lxGames.threed.PRECISION;
    }

    static zeroVector(v) {
        return (
            _Math.abs(v.x) < lxGames.threed.PRECISION
            && _Math.abs(v.y) < lxGames.threed.PRECISION
            && _Math.abs(v.z) < lxGames.threed.PRECISION
        );
    }

    static equalScalar(s0, s1) {
        return _Math.abs(s0 - s1) < lxGames.threed.PRECISION;
    }

    static equalVector(v, x, y, z) {
        return (
            ( _Math.abs(v.x - x) < lxGames.threed.PRECISION ) &&
            ( _Math.abs(v.y - y) < lxGames.threed.PRECISION ) &&
            ( _Math.abs(v.z - z) < lxGames.threed.PRECISION )
        );
    }

    static equalVectors(v1, v2) {
        return this.equalVector(v1, v2.x, v2.y, v2.z);
    }

    /**
     * Векторы перпендикулярны, если их скалярное произведение равно 0
     * */
    static normalVectors(v, w) {
        var dot = v.dot(w);
        return (_Math.abs(dot) < lxGames.threed.PRECISION);
    }

    /**
     * Векторы коллинеарны, если их векторное произведение - нулевой вектор
     * */
    static collinearVectors(v, w) {
        var cross = new THREE.Vector3();
        cross.crossVectors(v, w);
        return this.zeroVector(cross);
    }

    /**
     * Три вектора копланарны, если любой их них перпендикулярен векторному произведению двух других
     * */
    static coplanarVectors(v, w, y) {
        var cross = new THREE.Vector3();
        cross.crossVectors(v, w);
        return this.normalVectors(cross, y);
    }

    /**
     * Копланарность 4х точек: на 3х строится плоскость и проверяется, что расстояние до неё от 4й точки нулевое
     * */
    static coplanarPoints(a, b, c, d) {
        var plane = new THREE.Plane();
        plane.setFromCoplanarPoints(a, b, c);
        var dist = plane.distanceToPoint( d );
        return (_Math.abs(dist) <= lxGames.threed.PRECISION);
    }

    static coplanarTriangles(tr1, tr2) {
        var pl = new THREE.Plane(),
            normal = this.normalByCoplanarPoints(tr2[0], tr2[1], tr2[2]);
        pl.setFromCoplanarPoints( tr1[0], tr1[1], tr1[2] );
        if (!this.collinearVectors(pl.normal, normal)) return false;
        var dist = pl.distanceToPoint( tr2[0] );
        return (_Math.abs(dist) <= lxGames.threed.PRECISION);
    }

    /**
     * По 3м точкам вычисляет нормальный вектор к плоскости, задаваемой этими точками
     * */
    static normalByCoplanarPoints(p0, p1, p2) {
        var v01 = new THREE.Vector3(),
            v02 = new THREE.Vector3(),
            n = new THREE.Vector3();
        v01.subVectors( p0, p1 );
        v02.subVectors( p0, p2 );
        n.crossVectors(v01, v02);
        return n;
    }

    /**
     * По 3м точкам находит длины сторон задаваемого ими треугольника
     * */
    static triangleSides( v0, v1, v2 ) {
        var a = new THREE.Vector3(),
            b = new THREE.Vector3(),
            c = new THREE.Vector3();

        a.subVectors(v1, v0);
        b.subVectors(v2, v1);
        c.subVectors(v0, v2);

        return [
            a.length(),
            b.length(),
            c.length()
        ];
    }

    /**
     * Определяется пересекаются ли два копланарных треугольника
     * Треугольники заданы массивами векторов-вершин
     * */
    static intersectCoplanarTriangles(tr1, tr2) {
        function project( tr, axis ) {
            var min, max;
            min = axis.dot( tr[0] );
            max = min;
            for (var i=1; i<3; i++) {
                var d = axis.dot( tr[i] );
                if (d < min) min = d;
                if (d > max) max = d;
            }
            return [min, max];
        }

        function checkAxis( tr1, tr2, axis ) {
            var prj1 = project( tr1, axis );
            var prj2 = project( tr2, axis );
            if (prj2[1] >= prj1[1]) return prj2[0] - prj1[1];
            else return prj1[0] - prj2[1];
        }

        var n1 = this.normalByCoplanarPoints( tr1[0], tr1[1], tr1[2] ),
            pi = [0, 1, 2, 0],
            tr = [tr1, tr2];
        for (var j=0; j<2; j++) for (var i=0; i<3; i++) {
            var sub = new THREE.Vector3();
            var axis = new THREE.Vector3();
            sub.subVectors( tr[j][ pi[i] ], tr[j][ pi[i+1] ] );
            axis.crossVectors( sub, n1 );
            axis.normalize();
            var dist = checkAxis(tr1, tr2, axis);
            if (dist >= -lxGames.threed.PRECISION) return false;
        }

        return true;
    }
}
