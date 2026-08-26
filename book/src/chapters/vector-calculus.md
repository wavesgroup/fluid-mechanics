---
title: "Review of vector calculus"
order: 2
number: "2"
kind: "chapter"
---

In this section we will review the necessary concepts from vector calculus that
we will use in this course.
These include:
scalars, vectors and tensors;
gradient, divergence, and curl;
line, surface, and volume integrals;
and the Gauss and Stokes theorems.

## Scalars, vectors, and tensors

In this book we will use three types of quantities to describe fluid
properties: <em>scalars</em>, <em>vectors</em>, and <em>tensors</em>.

<em>Scalars</em> are completely described by their magnitude.
Examples of scalars are temperature, pressure, or density.
A value of 290 K, for example, completely describes the temperature of a fluid
at some point in space and time.
The fundamental scalar fields in fluid mechanics are the pressure, density,
and in some derivations, the velocity potential.
In the atmosphere, density is often represented with the air temperature and
humidity scalars through the ideal gas law.
In the ocean, density if typically represented with the water temperature and
salinity scalars through the equation of state.
The fundamental scalars for us are then, in this approximate order,
pressure, density, temperature, water salinity, and air humidity.
In equations, we will write scalars using italics, <em>e.g.</em> $T$, $p$, or $\rho$.

<em>Vectors</em> have a magnitude and a direction.
Examples of vectors are velocity, acceleration, or force.
In 3-dimensional Cartesian space with coordinates $(x, y, z)$, for example,
vector $\mathbf{u}(x,y,z)$ can be described by its components

<div class="display-math" id="eq:velocity">

$$
\mathbf{u} =
\begin{bmatrix}
u_x \\
u_y \\
u_z
\end{bmatrix}
$$

</div>

where $u_x$, $u_y$, and $u_z$ (each a scalar) are the components of $\mathbf{u}$
in the $x$, $y$, and $z$ directions, respectively.
This is the general conventional notation, however, we will often write vectors
inline as $\mathbf{u} = (u, v, w)$.
The fundamental vector field of fluid mechanics is the velocity.
Many other vector fields are derived from velocity, such as vorticity,
acceleration, and force.
In equations, we will write vectors using boldface, <em>e.g.</em> $\mathbf{u}$,
$\mathbf{a}$, or $\mathbf{F}$.

The magnitude, or norm, of a vector
$\mathbf{u}$ is written as $||\mathbf{u}||$ and calculated as

<div class="display-math">

$$
||\mathbf{u}|| = \sqrt{u^2 + v^2 + w^2}
$$

</div>

Here we're working in 3-dimensional Cartesian space, but vectors can be defined
in any number of dimensions, and the above definitions generalize exactly how
you'd expect them to.
The most ubiquitous vector field in fluid mechanics is the velocity.
In atmospheres and oceans, we will often refer to the velocity as wind and
current, respectively.
Wind speed is thus the magnitude (norm) of the wind vector, and likewise for
the current speed.

<em>Tensors</em> have magnitude, direction, and orientation.
They are vectors that act on each respective surface orthogonal to the direction
of the tensor.
Arguably the most important tensor in fluid mechanics is the stress tensor.
In 3-dimensional space, for example, a stress tensor can be described as:

<div class="display-math" id="eq:stress_tensor">

$$
\boldsymbol{\tau} =
\begin{bmatrix}
\tau_{xx} & \tau_{xy} & \tau_{xz} \\
\tau_{yx} & \tau_{yy} & \tau_{yz} \\
\tau_{zx} & \tau_{zy} & \tau_{zz}
\end{bmatrix}
$$

</div>

In this notation and index ordering, i.e. $\tau_{ij}$, the first index ($i$)
refers to the direction of the stress component, and the second index ($j$)
refers to the direction of the normal to the surface.
In other words, each row of the tensor contains the three components of a
vector, and each column contains the three surface normals that the stress
component is acting on.
For example, $\tau_{xy}$ is the stress in the x-direction and is acting on the
surface whose normal is in the y-direction (and which lies in the x-z plane).

One special type of tensor is the <em>identity tensor</em>
$\mathbf{I}$, which is a tensor that maps a vector onto itself.
In Cartesian coordinates, it is given by:

<div class="display-math" id="eq:identity_tensor">

$$
\mathbf{I} =
\begin{bmatrix}
1 & 0 & 0 \\
0 & 1 & 0 \\
0 & 0 & 1
\end{bmatrix}
$$

</div>

It may be useful to think of scalars as 0$^{th}$-order tensors, vectors as
1$^{st}$-order tensors, and tensors as 2$^{nd}$-order tensors.

## Unit vectors

Unit vectors are vectors with magnitude of 1.
A popular notation for unit vectors in Cartesian coordinates is $\mathbf{i}$,
$\mathbf{j}$, and $\mathbf{k}$, which point in the $x$, $y$, and $z$ directions,
respectively.
So, a vector $\mathbf{u}$ can be written as

<div class="display-math" id="eq:unit_vectors">

$$
\mathbf{u} = u_x \mathbf{i} + u_y \mathbf{j} + u_z \mathbf{k}
$$

</div>

Notice that you can get the unit vector by dividing any vector by its
magnitude, i.e. $\mathbf{u}/||u||$.

## Vector operations

Two vectors can be added, subtracted, or multiplied.
Although vector addition and subtraction are straightforward (simply add or
subtract each of their respective scalar components), vector multiplication is
more interesting.
There are many ways to multiply two vectors, but the two most important ones for
us are the <em>dot product</em> and the <em>cross product</em>.

### Dot product

The dot product of two 3-dimensional Cartesian vectors
$\mathbf{a}$ and $\mathbf{b}$ is an element-wise sum of their components
(and thus, a scalar!):

<div class="display-math">

$$
\mathbf{a} \cdot \mathbf{b} =
\begin{bmatrix}
a_1 \\
a_2 \\
a_3
\end{bmatrix}
\cdot
\begin{bmatrix}
b_1 \\
b_2 \\
b_3
\end{bmatrix}
= a_1 b_1 + a_2 b_2 + a_3 b_3
$$

</div>

More generally, the dot product of two n-dimensional vectors $\mathbf{a}$ and
$\mathbf{b}$ is

<div class="display-math" id="eq:dot_product_general">

$$
\mathbf{a} \cdot \mathbf{b} = \sum_{i=1}^{n} a_i b_i = a_1 b_1 + a_2 b_2 + \ldots + a_n b_n
$$

</div>

The dot product is commutative, meaning that
$\mathbf{a} \cdot \mathbf{b} = \mathbf{b} \cdot \mathbf{a}$.

The magnitude of a dot product of two vectors is equal to the product of their
magnitudes and the cosine of the angle $\theta$ between them:

<div class="display-math">

$$
\mathbf{a} \cdot \mathbf{b} = ||\mathbf{a}|| ||\mathbf{b}|| \cos{\theta}
$$

</div>

To visualize this relationship, take one vector and project it onto the other.
This projection is the magnitude of the vector times the cosine of the angle
between them.
Now, one vector and the projection of the other onto the first vector are
pointing in the same direction, so their dot product is the product of their
magnitudes.
It can be useful to think of a dot product as collapsing the two vectors into a
single scalar that contains contributions from each of their components.

<div class="interactive-slot" data-interactive="dot-product"></div>

The following listing shows how to manually compute the dot product of two
vectors in Python using the built-in arithmetic operators:

<figure class="book-listing" id="lst:dot_product_arithmetic">

```python
import numpy as np

# initialize two vectors; specific values are arbitrary.
a = np.array([1, 2, 3])
b = np.array([4, 5, 6])

c = 0  # initialize the result variable
for i in range(a.size):  # loop over indices of the vector
    c += a[i] * b[i]  # multiply elements and add to the result
```

</figure>

Notice that this an exact implementation of the right-hand side of Eq.
(<a class="eqref" data-key="eq:dot_product_general"></a>).
The NumPy library, however, allows element-wise multiplication of vectors,
which is both more computationally efficient and more concise:

<figure class="book-listing" id="lst:dot_product_numpy">

```python
c = np.sum(a * b)  # multiply element-wise and sum up the components
```

</figure>

Notice that this is an exact implementation of the middle part of Eq.
(<a class="eqref" data-key="eq:dot_product_general"></a>).
Even though the dot product is simple to implement, as we did above, NumPy
provides a function that is even more concise, and likely the most efficient
way to compute the dot product:

<figure class="book-listing" id="lst:dot_product_numpy_dot">

```python
c = np.dot(a, b)
```

</figure>

Although it's important to understand how to implement the fundamental vector
operations by hand, and do it yourself at least once, in practice it's best to
use established libraries such as NumPy, as they are well tested and optimized
for computational efficiency.

### Cross product

The cross product of two vectors $\mathbf{a}$ and
$\mathbf{b}$ is defined as:

<div class="display-math" id="eq:cross_product">

$$
\mathbf{a} \times \mathbf{b} =
det \begin{bmatrix}
\mathbf{i} & \mathbf{j} & \mathbf{k} \\
a_x & a_y & a_z \\
b_x & b_y & b_z
\end{bmatrix}
$$

</div>

where $det(\mathbf{M})$ means the <em>determinant of matrix $\mathbf{M}$</em>.

Using the so-called <em>rule of Sarrus</em>, the cross product can be calculated
as:

<div class="display-math">

$$
\mathbf{a} \times \mathbf{b} = (a_y b_z - a_z b_y) \mathbf{i} +
(a_z b_x - a_x b_z) \mathbf{j} + (a_x b_y - a_y b_x) \mathbf{k}
$$

</div>

or:

<div class="display-math">

$$
\mathbf{a} \times \mathbf{b} =
\begin{bmatrix}
a_y b_z - a_z b_y \\
a_z b_x - a_x b_z \\
a_x b_y - a_y b_x
\end{bmatrix}
$$

</div>

The result of a cross product is a vector that is orthogonal to both $\mathbf{a}$
and $\mathbf{b}$.
Its orientation in space is determined by the right-hand rule:
if you point your right thumb in the direction of $\mathbf{a}$ and your index
finger in the direction of $\mathbf{b}$, then your middle finger will point in
the direction of $\mathbf{a} \times \mathbf{b}$.

The magnitude of the cross product is equal to the product of the magnitudes of
the two vectors times the sine of the angle between them:

<div class="display-math" id="eq:cross_product_magnitude">

$$
||\mathbf{a} \times \mathbf{b}|| = ||\mathbf{a}|| ||\mathbf{b}|| \sin{\theta}
$$

</div>

So, the magnitude of the cross product is largest when the two vectors are
orthogonal.
Unlike the dot product, the cross product is anticommutative, meaning that
$\mathbf{a} \times \mathbf{b} = -\mathbf{b} \times \mathbf{a}$.

<div class="interactive-slot" data-interactive="cross-product"></div>

In fluid mechanics, a cross product will often come up when we are interested in
the rotation of a vector field.
For example, vorticity is the curl of the velocity field.

## Matrix multiplication

Occasionally, we will need to multiply a vector by a matrix, or, a matrix by a
matrix.
As a vector is a special case of a matrix in which either the number of rows or
columns is 1, the same rules of matrix multiplication will apply when we
multiply a vector by a matrix or a matrix by a matrix.
These operations are not commutative, meaning that the order of multiplication
matters.

Take two matrices $\mathbf{A}$ and $\mathbf{B}$ such that

<div class="display-math">

$$
\mathbf{A} =
\begin{bmatrix}
a_{11} & a_{12} & a_{13} \\
a_{21} & a_{22} & a_{23} \\
a_{31} & a_{32} & a_{33}
\end{bmatrix}
$$

</div>

and:

<div class="display-math">

$$
\mathbf{B} =
\begin{bmatrix}
b_{11} & b_{12} & b_{13} \\
b_{21} & b_{22} & b_{23} \\
b_{31} & b_{32} & b_{33}
\end{bmatrix}
$$

</div>

The result of their multiplication is a matrix $\mathbf{C}$ given by:

<div class="display-math">

$$
\mathbf{C} = \mathbf{A} \mathbf{B} =
\begin{bmatrix}
a_{11} b_{11} + a_{12} b_{21} + a_{13} b_{31} &
a_{11} b_{12} + a_{12} b_{22} + a_{13} b_{32} &
a_{11} b_{13} + a_{12} b_{23} + a_{13} b_{33} \\
a_{21} b_{11} + a_{22} b_{21} + a_{23} b_{31} &
a_{21} b_{12} + a_{22} b_{22} + a_{23} b_{32} &
a_{21} b_{13} + a_{22} b_{23} + a_{23} b_{33} \\
a_{31} b_{11} + a_{32} b_{21} + a_{33} b_{31} &
a_{31} b_{12} + a_{32} b_{22} + a_{33} b_{32} &
a_{31} b_{13} + a_{32} b_{23} + a_{33} b_{33}
\end{bmatrix}
$$

</div>

That is, the entry $c_{ij}$ of the product is obtained by multiplying
term-by-term the entries of the $i$-th row of $\mathbf{A}$ and the $j$-th column
of $\mathbf{B}$, and summing these products.
In other words, $c_{ij}$ is the dot product of the $i$-th row of $\mathbf{A}$
and the $j$-th column of $\mathbf{B}$.
Although the matrices are not required to be square, the number of columns
of $\mathbf{A}$ must be equal to the number of rows of $\mathbf{B}$.

## Total and partial derivatives

We will denote total and partial
derivative operators (for example, in time $t$)
as $\frac{d}{dt}$ and $\frac{\partial}{\partial t}$.
Scalars, vectors, and tensors alike can be differentiated with respect to any
variable.
A derivative of a vector is simply a vector of derivatives of its components:

<div class="display-math">

$$
\frac{d\mathbf{u}}{dt}
= \left(\frac{d u_x}{d t}, \frac{d u_y}{d t}, \frac{d u_z}{d t}\right)
= \frac{du_x}{dt} \mathbf{i} + \frac{du_y}{dt} \mathbf{j} + \frac{du_z}{dt} \mathbf{k}
= \begin{bmatrix}
\frac{du_x}{dt} \\
\frac{du_y}{dt} \\
\frac{du_z}{dt}
\end{bmatrix}
$$

</div>

<div class="display-math">

$$
\frac{\partial \mathbf{u}}{\partial t}
= \left(\frac{\partial u_x}{\partial t}, \frac{\partial u_y}{\partial t}, \frac{\partial u_z}{\partial t}\right)
= \frac{\partial u_x}{\partial t} \mathbf{i} + \frac{\partial u_y}{\partial t} \mathbf{j} + \frac{\partial u_z}{\partial t} \mathbf{k}
= \begin{bmatrix}
\frac{\partial u_x}{\partial t} \\
\frac{\partial u_y}{\partial t} \\
\frac{\partial u_z}{\partial t}
\end{bmatrix}
$$

</div>

and likewise for tensors.

## Gradient, divergence, and curl

Now, we introduce another operator that builds on top of previous
concepts to describe how scalar and vector fields vary in space.
This operator is called <em>del</em> and is denoted by the symbol
$\nabla$ (pronounced "nabla"):

<div class="display-math" id="eq:nabla">

$$
\nabla = \frac{\partial}{\partial x} \mathbf{i} +
\frac{\partial}{\partial y} \mathbf{j} +
\frac{\partial}{\partial z} \mathbf{k}
$$

</div>

Written as above, $\nabla$ cannot stand on its own but must be applied as an
operator to a field.
A good way to think about $\nabla$ is as of a <em>differential operator</em>,
which itself is a 3-dimensional vector that can operate on scalars or vectors.
Specifically:

- $\nabla p$ is as vector that is a gradient of a scalar field $p$;
      it quantifies how $p$ changes in space.

- $\nabla \cdot \mathbf{u}$ is a scalar that is the divergence of a vector
      field $\mathbf{u}$; it quantifies how $\mathbf{u}$ flows out of a point.

- $\nabla \times \mathbf{u}$ is a vector that is the curl of a vector field
      $\mathbf{u}$; it quantifies how $\mathbf{u}$ rotates around a point.

Although, strictly speaking, one is a symbol and the other is an operator,
$\nabla$ ("nabla") and "del" are often used interchangeably when reading equations
out loud.

### Gradient

The gradient of a scalar field $T$ is a vector field that points in the
direction of the greatest rate of increase of $T$.
It is denoted by $\nabla T$ and is defined as

<div class="display-math" id="eq:gradient">

$$
\nabla T = \frac{\partial T}{\partial x} \mathbf{i} +
\frac{\partial T}{\partial y} \mathbf{j} +
\frac{\partial T}{\partial z} \mathbf{k}
$$

</div>

Gradient of a scalar field is a vector that points in the direction of the
steepest increase of that field, and its magnitude is the rate of that increase.
Imagine hiking up a hill; the gradient of the terrain is a vector
that is pointing toward the steepest incline, and its magnitude is the steepness
of that incline.
Hover or tap the field below to read $T$ and see $\nabla T$:
the arrow is orthogonal to the isolines and points uphill.

<div class="interactive-slot" data-interactive="gradient-field"></div>

### Divergence

The divergence of a vector field $\mathbf{u}$ is a scalar field that describes
the rate at which the vector field flows out of a point.
It is denoted by $\nabla \cdot \mathbf{u}$ and is defined as

<div class="display-math" id="eq:divergence">

$$
\nabla \cdot \mathbf{u} = \frac{\partial u_x}{\partial x} +
\frac{\partial u_y}{\partial y} + \frac{\partial u_z}{\partial z}
$$

</div>

Divergence of a vector field is a scalar that describes how much the vector
field is expanding or contracting at a point.
Negative divergence is called convergence.
The explorer below colors the plane by $\nabla \cdot \mathbf{u}$ and draws
$\mathbf{u}$ as arrows: spreading arrows and warm colors are sources;
converging arrows and cool colors are sinks.

<div class="interactive-slot" data-interactive="divergence-field"></div>

### Curl

The curl of a vector field $\mathbf{u}$ is a vector field that describes the
rotation of the vector field.
It is denoted by $\nabla \times \mathbf{u}$ and is defined as

<div class="display-math" id="eq:curl">

$$
\nabla \times \mathbf{u} = \left( \frac{\partial u_z}{\partial y} -
\frac{\partial u_y}{\partial z} \right) \mathbf{i} +
\left( \frac{\partial u_x}{\partial z} -
\frac{\partial u_z}{\partial x} \right) \mathbf{j} +
\left( \frac{\partial u_y}{\partial x} -
\frac{\partial u_x}{\partial y} \right) \mathbf{k}
$$

</div>

Curl of a vector field is another vector that is orthogonal to the original
vector field and quantifies how much the vector field is rotating around a
point.
When curl is zero, the vector field is said to be <em>irrotational</em>.
In two dimensions the curl is out of the plane, $(\nabla \times \mathbf{u})_z$.
The paddle wheel below spins with that local rotation; shear is a reminder
that curl need not look like a vortex.

<div class="interactive-slot" data-interactive="curl-field"></div>

### Laplacian

The Laplacian is a second-order differential operator that
can be applied to both scalar and vector fields.
It measures the rate at which field varies in space and is defined as:

<div class="display-math" id="eq:laplacian">

$$
\nabla^2 = \frac{\partial^2}{\partial x^2} + \frac{\partial^2}{\partial y^2} + \frac{\partial^2}{\partial z^2}
$$

</div>

Applied to a scalar field $T$, it is:

<div class="display-math">

$$
\nabla^2 T = \frac{\partial^2 T}{\partial x^2} + \frac{\partial^2 T}{\partial y^2} + \frac{\partial^2 T}{\partial z^2}
$$

</div>

Applied to a vector $\mathbf{u} = (u, v, w)$, it is applied to each component:

<div class="display-math">

$$
\nabla^2 \mathbf{u} = \begin{bmatrix}
\frac{\partial^2 u}{\partial x^2} + \frac{\partial^2 u}{\partial y^2} + \frac{\partial^2 u}{\partial z^2} \\
\frac{\partial^2 v}{\partial x^2} + \frac{\partial^2 v}{\partial y^2} + \frac{\partial^2 v}{\partial z^2} \\
\frac{\partial^2 w}{\partial x^2} + \frac{\partial^2 w}{\partial y^2} + \frac{\partial^2 w}{\partial z^2}
\end{bmatrix}
$$

</div>

The Laplacian of a scalar is thus a scalar and the Laplacian of a vector is a
vector.
In some literature you will see the Laplacian written as $\Delta$, but here we
will use $\nabla^2$ to avoid confusion with the $\Delta$ that we use to denote
a finite increment.

### Useful vector identities

Curl of a gradient of a scalar field is always zero:

<div class="display-math">

$$
\nabla \times (\nabla T) = 0
$$

</div>

Further, divergence of a curl of a vector field is always zero:

<div class="display-math">

$$
\nabla \cdot (\nabla \times \mathbf{u}) = 0
$$

</div>

Finally, curl of a curl of a vector field is:

<div class="display-math">

$$
\nabla \times (\nabla \times \mathbf{u}) = \nabla (\nabla \cdot \mathbf{u}) - \nabla^2 \mathbf{u}
$$

</div>

Some of these identities will come handy when we derive the conservation of
vorticity laws.

### Computing and visualizing gradient, divergence, and curl

The explorers above evaluate $\nabla T$, $\nabla \cdot \mathbf{u}$, and
$\nabla \times \mathbf{u}$ from the closed-form derivatives of a few analytic
fields.
On a discrete grid the same operators are approximated with finite differences,
for example $\partial T/\partial x \approx (T_{i+1} - T_{i-1}) / (2 \Delta x)$.
Exercise 5 asks you to implement that numerically.

## Gauss and Stokes theorems

The most useful in our work will be variants of the
<em>Gauss and Stokes theorems</em>.
The Gauss theorem relates a volume integral of a divergence of a vector field
to a surface integral of that vector field.
The Stokes theorem relates a surface integral of the curl of a vector field to
a line integral of that vector field.
Here, they are stated for reference, and we'll explore their meaning and
application in more detail as we use them to derive the fundamental equations
for fluid flows.

### Gauss theorem

The Gauss theorem states that the volume integral of the
divergence of a vector field $\mathbf{u}$ over a volume $V$ is equal to the
surface integral of $\mathbf{u}$ over the surface $A$ that encloses $V$:

<div class="display-math" id="eq:divergence_theorem">

$$
\int_V \nabla \cdot \mathbf{u} dV = \oint_A \mathbf{u} \cdot d\mathbf{A}
$$

</div>

In other words, the rate of change of the fluid mass within a volume is equal to
the flow normal through the surface that encloses that volume.
This form of Gauss's theorem is also known as the
<em>divergence theorem</em>.
It will come in handy when we derive the conservation of mass (continuity)
equation.

### Stokes theorem

The Stokes theorem states that the surface integral of the curl of a
vector field $\mathbf{u}$ over a surface $A$ is equal to the line integral of
$\mathbf{u}$ over the boundary of $A$:

<div class="display-math">

$$
\int_A (\nabla \times \mathbf{u}) \cdot d\mathbf{A} = \oint_{\partial A} \mathbf{u} \cdot d\mathbf{l}
$$

</div>

In other words, the rotation rate of the fluid over a surface area is equal to
the flow velocity integrated around the boundary of that surface.

## Summary

In this chapter, we reviewed:

- Scalars, vectors, and tensors;

- Vector algebra: dot product ($\mathbf{a} \cdot \mathbf{b}$) and cross
      product ($\mathbf{a} \times \mathbf{b}$);

- Derivatives: total ($\frac{d}{dt}$) and partial ($\frac{\partial}{\partial t}$);

- Gradient, divergence ($\nabla \cdot \mathbf{u}$), and curl ($\nabla \times \mathbf{u}$);

- Gauss theorem that relates volume and surface integrals:
      $\int_V \nabla \cdot \mathbf{u} dV = \oint_A \mathbf{u} \cdot d\mathbf{A}$;

- Stokes theorem that relates surface and line integrals:
      $\int_A (\nabla \times \mathbf{u}) \cdot d\mathbf{A} = \oint_{\partial A} \mathbf{u} \cdot d\mathbf{l}$.

These concepts will serve as the basic building blocks for everything that
follows in the remainder of this course.

## Exercises

1. Pick your favorite programming language (or ask for a recommendation for one).
      Write a program that defines a scalar, a vector, and a tensor, and assign
      numerical values to them.
      Print the values to the screen.
      Is there a difference in how you define them in your program?

2. What is the dot product of two orthogonal vectors?
      How about the dot product of a vector with itself?
      Please write out the solution step by step.

3. Write a program that calculates the cross product of two vectors.
      Please implement your solution using the basic arithmetic operations such as
      addition and multiplication.
      Then, see if your programming language or one of its software libraries
      provides a function to do this.
      Can you verify your implementation by comparing its output to that of the
      library function?

4. How would you calculate a derivative of a quantity
      (scalar, for example) in a computer program, e.g. $\frac{\partial a}{\partial x}$?
      Consider that you can approximate a derivative as a difference between two
      values of the quantity at two points in space.
      In other words, assume $\partial a \approx \Delta a = a(x_2) - a(x_1)$,
      and similar for $x$.

5. Write a computer program that calculates the gradient of a scalar field,
      and the divergence and curl of a vector field.

6. Draw example vector fields that are: (a) non-divergent and irrotational,
      (b) divergent and irrotational, (c) non-divergent and rotational, and (d)
      divergent and rotational.
