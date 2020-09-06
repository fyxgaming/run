/**
 * codec.js
 *
 * Converts complex javascript objects with jigs into JSON
 *
 * This conversion is basically what determines what kinds of data may be stored in Jigs, stored
 * as class properties, or passed into functions. If we were to support a new kind of data type,
 * we would start by supporting it here.
 *
 * We use a custom JSON notation encoding because we haven't found any other suitable format
 * to-date. This encoding is JSON and may be used as such. However, it is also special JSON.
 * The JSON represents a complex JS object, and through decoding, we can convert it back into
 * a rich object.
 *
 * We use what we call "$ objects" to do this. $ objects are JSON objects with a single property
 * that begins with '$'. This means it contains a special value that JSON is unable to
 * represent. Through this approach, in addition to standard JSON, we support the following:
 * 
 *      Type                    $ Prefix        Example
 *      ---------               --------        -----------
 *      Undefined               $und            { $und: 1 }
 *      NaN                     $nan            { $nan: 1 }
 *      Infinity                $inf            { $inf: 1 }
 *      Negative infinity       $ninf           { $ninf: 1 }
 *      Set instance            $set            { $set: [1], props: { n: 1 } }
 *      Map instance            $map            { $map: [[1, 2]], props: { n: 1 } }
 *      Uint8Array instance     $ui8a           { $ui8a: '<base64data' }
 *      Jig/Code/Berry          $jig            { $jig: 1 }
 *      Arbitrary object        $arb            { $arb: { n: 1 }, T: { $jig: 1 } }
 *      Object                  $obj            { $obj: { $n: 1 } }
 *      Sparse array            $arr            { $arr: { 0: 'a', 100: 'c' } }
 *      Duplicate object        $dup            { $dup: ['n', 'm'] }
 * 
 * Order of properties is important and must be preserved during encode and decode. Duplicate paths
 * are arrays into the encoded object, not the original object.
 */