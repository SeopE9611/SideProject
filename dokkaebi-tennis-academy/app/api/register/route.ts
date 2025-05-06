import { NextResponse } from "next/server"
import clientPromise from "@/lib/db"
import { hash } from "bcryptjs"

export async function POST(req: Request) {
  const { email, password, name } = await req.json()

  if (!email || !password || !name) {
    return NextResponse.json({ message: "필수 항목 누락" }, { status: 400 })
  }

  try {
    const client = await clientPromise
    const db = client.db("tennis_academy")
    const userExists = await db.collection("users").findOne({ email })

    if (userExists) {
      return NextResponse.json({ message: "이미 존재하는 이메일입니다." }, { status: 400 })
    }

    const hashedPassword = await hash(password, 10)

    await db.collection("users").insertOne({
      email,
      name,
      hashedPassword,
    })

    return NextResponse.json({ message: "회원가입 완료" }, { status: 201 })
  } catch (error) {
    console.error("회원가입 오류:", error)
    return NextResponse.json({ message: "서버 오류 발생" }, { status: 500 })
  }
}
