
    let name = "Tharuni"
    console.log(name);

    name = "Hari"
    console.log(name);

    const clg = "Loyola"
    console.log(clg);

    let att = "Academy"
    const msg = clg +" "+ att;
    console.log(msg)
    
    console.log(`Hello ${name}`);

    let age = 21;
    let course = "ML";
    console.log(`My name is ${name}, I am ${age} old and I study ${course}`);

    function greet(nam){
        console.log(`Hello ${nam}`);
    }

    greet("Sri");

    const square = (num) => {
        return num*num;
    };
    console.log(square(5));


    function mult(a,b){
        return a*b;
    }

    let c = mult(5,10);
    console.log(c);

    const fruits = ["Apple", "Mango", "Orange"];
    fruits.map((fruit) => {
        console.log(fruit);
    });

    let nums = [1,2,3];
    const dnum = nums.map((num) => {
        return num*2;
    });
    console.log(dnum);

    const students = [
    { id: 1, name: "Anu" },
    { id: 2, name: "Priya" },
    { id: 3, name: "Rahul" }
];

function App() {
    return (
        <div>
            {students.map((student) => (
                <p key={student.id}>
                    {student.name}
                </p>
            ))}
        </div>
    );
}

