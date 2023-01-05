# knob-maker

Create parameterized knobs with BABYLONJS and export them as STL. A generator app is hosted [here](https://www.d0st.me/app/knobs)

# Installation

In command prompt run the following to install dependencies:
```
npm install
```

# Running Demo

To launch a demo, run the following command:
```
npm start
```
This will setup the demo folder and start a simple server. Open browser and navigate to localhost:8080. (The origin may be different, check console messages.)

# API USAGE 

Create a new knob by passing KNOB_CONFIG

```
const KNOB_CONFIG = {
	body: {
		height: 40, //creates 40 mm knob
	},
	screwHole: {
		sides: 4, // a square hole
		segments: [
			{height: 0.25, radius: 10} //create a hole 10 mm from bottom
		]
	}
}
const knob = new Knob(KNOB_CONFIG , babylonjsScene)
```

The constructor takes KNOB_CONFIG as the first parameter, described below. A BABYLONJS scene object must be passed as a second parameter. An optional third Boolean parameter can be used to setup the knob in draft mode. Draft mode renders all objects with transparency. Additionally, subtractive operations are not performed in draft mode to improve performance

## KNOB_CONFIG

| Property&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;| Value     	| Description |
|--------------					|-----------	|------------|
| body 							|      			| Describe the height and side profile of the body|
| &emsp;height					|Number      			| Overall height of the knob.|
| &emsp;sides					|Number      			| Number of faces radially. Use a high number for a smooth surface.|
| &emsp;segments      				| Array\<SEGMENT\>		| Segments define the profile of the knob. Its an array of points along the side profile containing height, radius and smoothing factor. They can be added in any order, but are sorted by height on creation. When less than two segments are present, profile will always be cylindrical|
| screwHole 							|      			| Describe the internal hole of the knob|
| &emsp; sides 							|Number     			| Number of internal faces radially. Use a high number for a smooth internal surface|
| &emsp; angle 							| Number. In Degrees. [0,360]     			| Angle offset with the body. This is useful when the hole has finite sides.|
| &emsp;segments 							| Array\<SEGMENT\>     		| Similar to segments for body but for internal profile. When no segments are passed screwHole isn't created.|
| &emsp;splines 							| Array\<SPLINE\>     		| Describe internal splines |
| &emsp;threads 							| Array\<THREAD\>     		| Describe internal threads |
| surface 							|      			| Describe surface feature on body|
| &emsp; knurling 								| Array\<KNURLING\>    			| |
| &emsp; splines 								| Array\<SPLINE\>    			| |
| &emsp; threads 								| Array\<THREAD\>    			| |
| pointers | Array\<Pointer\> | Array of pointers. Pointer Config described below


## SEGMENT
| Property         				| Value     	| Description |
|--------------					|-----------	|------------|
| radius      			| Number		|        |
| height      			| [0,1]			| Percentage position along the height.       	 |
| smoothing      			| [-1,1]		| Factor to curve the profile till the next segment point. Negatives values curve inward        |

## SPLINE

| Property&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;     				| Value     	| Description |
|--------------					|-----------	|------------|
| count      			| Number		| "Number of splines radially"    |
| range     			| Array\<Number\> length:2		| Span of the splines along the profile. Values are percentage of profile height   |
| ?thickness      		| In Degrees [0,120] 		| Thickness at the tip of the spline profile in degrees.      |
| ?rootThickness    		| In Degrees [0,120] 		| Thickness at the base of the spline profile in degrees.     |
| ?smoothing    			| [-1,1] 		| Alter the spline profile curve when tip and root thickness are different.    |
| ?width    				| Number		| Setting this ignores thickness and creates spline with a constant width. When height isn't set, spline with shortest possible height will be created. This is useful when flat sections for d-shafts are needed. |
| ?height    			| Number			|    |
| ?topScale    				| [0,1] default=1	| Use <1 to taper at the top |
| ?bottomScale    			| [0,1] default=1	| Use <1 to taper at the bottom |
| ?scaleSmoothing    			| [0,1] default=1	| Use in conjunction with top/bottom scale to smooth the scaling along the profile. |
| ?angle | [0,90] in degrees | "Curve the spline radially along the surface" |
| ?angleSmoothing | [-1,1] | "Smooth the curve angle" |
| ?subtractive | Boolean | Cut the spline structure into the body. [Not fully Implemented]  |
| ?taperWidth | Boolean | By default only height is scaled while applying top and bottom Scale. Use this toggel to scale spline thickness as well

## THREAD

Only metric threads are created.

| Property     				| Value     	| Description |
|--------------					|-----------	|------------|
| pitch     			| Number		|        |
| range     			| Array\<Number\> length:2		| The span of the thread along the profile. Values are percentage of profile height   |
| ?depth      			| Number		| When not set, depth is computed as per metric standards.    	 |
| ?taperTop      		| [0, 0.5]		| Start tapering at percentage position from top in the thread range |
| ?taperBottom     		| [0, 0.5]		| Start tapering at percentage position from bottom in the thread range |
| ?leftHanded    		| Boolean		| Set winding direction of threads |


## KNURLING

| Property &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;       				| Value     	| Description |
|--------------					|-----------	|------------|
| shape  				| "Pyramid"\|"Cylinder"\|"Rectangle"\|"Cone"\|"Triangle"			| The shape of individual unit. Default is "pyramid"|
| range     			| Array\<Number\> length:2		| Knurling span along the profile. Values are percentage of profile height   |
| width      			| Number		| Width of individual shape    |
| height 				| Number 		| Height of individual shape      |
| depth    				| Number		| Depth of the individual shape   |
| verticalSpacing   	| Number 		| Vertical distance between two shapes |
| columns  				| Number		| Number of columns radially |
| ?rise    			| Number		|  Not to be confused with depth. Shapes are tangent to the surface with flat base. With values <1 they can become flush  |
| ?shapeRotation			| [-180,180] In Degrees	| Angle of rotation of each individual shape |
| ?taper  		| [0,0.5]	| Use this to taper knurling at the boundaries. Value is Percentage of knurling range [0, 0.5]|
| ?taperAll			| Boolean	| Scale all dimensions uniformly while tapering. By default only depth is scaled |

## POINTER

| Property     				| Value     	| Description |
|--------------					|-----------	|------------|
| height     			| Number		|         Absolute height of the pointer
| angle     			| [0,360] In Degrees	 | Angle offset with respect to body  |
| position      		| [0,1]		| Position as percentage of height of the body|
| radialOffset      	| Number		| Radius to begin pointer from|
| length     			| Number		| length of the pointer radially|
| widthStart   		| Number In Degrees		| starting width of the pointer |
| widthEnd   		| Number In Degrees		| terminal width of the pointer |

## Export

Use the exportSTL method to export the knob as STL. When the "download" flag is passed, browsers will download an stl file. Method returns stl as string.

```
const downloadFile = true
const stlString = knob.exportSTL(downloadFile)
```

To download config use knob.exportJSON method.

```
const downloadFile = true
const jsonString = knob.exportJSON(downloadFile)
```

## Toggle Draft Mode
Draft mode is intended for faster prototyping. Draft mode disables CSG, which are inherently process intensive.

```
knob.setDraftMode(true)
```

## Contributions

Please contribute templates to the project, if you create a useful one.
