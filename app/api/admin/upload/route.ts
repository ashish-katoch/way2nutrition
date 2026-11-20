import {S3Client,PutObjectCommand} from '@aws-sdk/client-s3';
import {requireAdmin} from '@/lib/admin';
import {fail,reject,sameOrigin} from '@/lib/http';
export async function POST(request:Request){
 try{
  sameOrigin(request);await requireAdmin(request);
  const {R2_ACCOUNT_ID,R2_ACCESS_KEY_ID,R2_SECRET_ACCESS_KEY,R2_BUCKET,R2_PUBLIC_URL}=process.env;
  if(!R2_ACCOUNT_ID||!R2_ACCESS_KEY_ID||!R2_SECRET_ACCESS_KEY||!R2_BUCKET||!R2_PUBLIC_URL)reject(503,'Connect R2 image storage in the server settings.');
  if(Number(request.headers.get('content-length'))>6000000)reject(413,'Choose an image under 5 MB.');
  const form=await request.formData();const file=form.get('file');
  if(!(file instanceof File)||file.size>5000000||file.size===0)reject(400,'Choose an image under 5 MB.');
  const bytes=new Uint8Array(await file.arrayBuffer());
  const isPng=bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71;
  const isJpg=bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
  const isWebp=new TextDecoder().decode(bytes.slice(0,4))==='RIFF'&&new TextDecoder().decode(bytes.slice(8,12))==='WEBP';
  const extension=isPng?'png':isJpg?'jpg':isWebp?'webp':'';
  if(!extension)reject(400,'Use a PNG, JPEG, or WebP image.');
  const key='products/'+crypto.randomUUID()+'.'+extension;
  const client=new S3Client({region:'auto',endpoint:'https://'+R2_ACCOUNT_ID+'.r2.cloudflarestorage.com',credentials:{accessKeyId:R2_ACCESS_KEY_ID!,secretAccessKey:R2_SECRET_ACCESS_KEY!}});
  await client.send(new PutObjectCommand({Bucket:R2_BUCKET,Key:key,Body:bytes,ContentType:isPng?'image/png':isJpg?'image/jpeg':'image/webp',CacheControl:'public,max-age=31536000,immutable'}));
  return Response.json({key,url:R2_PUBLIC_URL!.replace(/\/$/,'')+'/'+key});
 }catch(e){return fail(e);}
}
