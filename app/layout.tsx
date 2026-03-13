export default function RootLayout(props: any) {
  return (
    <html lang="de">
      <body style={{margin:0,fontFamily:"Arial",background:"#f3f4f6"}}>
        {props.children}
      </body>
    </html>
  )
}
